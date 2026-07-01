import * as fs from 'fs';
import * as path from 'path';
import { Project, SyntaxKind } from 'ts-morph';

const SCHEMA_DIR = path.resolve(import.meta.dirname, '../src/schema');
const OUTPUT_DIR = path.resolve(import.meta.dirname, '../src/types');

const project = new Project();
project.addSourceFilesAtPaths(path.join(SCHEMA_DIR, '*.ts'));

function mapDrizzleTypeToTypeBox(initializerText: string): string {
    if (initializerText.includes('uuid') || initializerText.includes('identifierColumnType')) {
        return "{ type: 'string', format: 'uuid' }";
    }
    if (initializerText.includes('boolean')) {
        return "{ type: 'boolean' }";
    }
    if (initializerText.includes('jsonb') || initializerText.includes('json')) {
        return "{ type: 'object', additionalProperties: true }";
    }
    if (initializerText.includes('integer') || initializerText.includes('serial')) {
        return "{ type: 'number' }";
    }
    if (initializerText.includes('timestamp')) {
        // Postgres/Bun serialization may emit non-RFC3339 timestamp strings.
        // Keep contract compatible by accepting string timestamps.
        return "{ type: 'string' }";
    }
    if (initializerText.includes('varchar')) {
        const lenMatch = initializerText.match(/length:\s*(\d+)/);
        return lenMatch ? `{ type: 'string', maxLength: ${lenMatch[1]} }` : "{ type: 'string' }";
    }
    return "{ type: 'string' }";
}

// Hilfsfunktion: Prüft, ob eine Spalte beim Insert optional ist
function isOptionalForInsert(initializerText: string): boolean {
    return (
        !initializerText.includes('.notNull()') ||
        initializerText.includes('.default(') ||
        initializerText.includes('.defaultNow()') ||
        initializerText.includes('$onUpdate(') ||
        initializerText.includes('serial(')
    );
}

async function generate() {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const sourceFiles = project.getSourceFiles().filter(sf => !sf.getBaseName().endsWith('helpers.ts'));

    for (const sourceFile of sourceFiles) {
        const fileName = sourceFile.getBaseName();
        const baseNameWithoutExt = path.basename(fileName, '.ts');

        const userFilePath = path.join(OUTPUT_DIR, fileName);
        const generatedFilePath = path.join(OUTPUT_DIR, `_${fileName}`);

        if (!fs.existsSync(userFilePath)) {
            let userContent = `// Hier können manuelle Typ-Erweiterungen für ${baseNameWithoutExt} hinzugefügt werden.\n`;
            userContent += `export * from './_${baseNameWithoutExt}';\n`;
            fs.writeFileSync(userFilePath, userContent);
            console.log(`🆕 Platzhalter-Datei angelegt: /src/types/${fileName}`);
        }

        let fileContent = `// ⚠️ GENERATED FILE - DO NOT EDIT DIRECTLY\n`;
        fileContent += `import { Type, type Static } from '@sinclair/typebox';\n\n`;
        let hasContent = false;

        // --- DETECT: Exported const values that need to be inlined from schema ---
        const constDefinitions: string[] = [];
        const variableStatements = sourceFile.getVariableStatements();
        for (const statement of variableStatements) {
            if (!statement.isExported()) continue;
            for (const declaration of statement.getDeclarations()) {
                const initializer = declaration.getInitializer();
                if (!initializer) continue;

                // Skip pgTable definitions - those are handled separately
                if (initializer.getText().startsWith('pgTable(')) continue;

                // This is an exported const that's not a table (like ConfigValueTypes)
                // We need to inline it (copy its definition)
                // Extract the full declaration from the parent statement (which includes 'const')
                const declarationText = declaration.getText();
                constDefinitions.push(`export const ${declarationText}`);
            }
        }

        // Add inlined const definitions
        if (constDefinitions.length > 0) {
            constDefinitions.forEach(def => {
                fileContent += def + '\n\n';
            });
            hasContent = true;
        }

        // --- PART 1: Enums, Types, Interfaces kopieren ---
        const enums = sourceFile.getEnums();
        const typeAliases = sourceFile.getTypeAliases();
        const interfaces = sourceFile.getInterfaces();

        if (enums.length > 0 || typeAliases.length > 0 || interfaces.length > 0) {
            fileContent += `// --- Extracted Types ---\n`;
            enums.forEach(e => { fileContent += e.getText() + '\n\n'; });
            typeAliases.forEach(t => { fileContent += t.getText() + '\n\n'; });
            interfaces.forEach(i => { fileContent += i.getText() + '\n\n'; });
            hasContent = true;
        }

        // --- PART 2: Drizzle-Tabellen auslesen ---
        let drizzleContent = '';

        for (const statement of variableStatements) {
            if (!statement.isExported()) continue;

            for (const declaration of statement.getDeclarations()) {
                const initializer = declaration.getInitializer();
                if (!initializer) continue;

                if (initializer.getText().startsWith('pgTable(')) {
                    const pascalName = declaration.getName();
                    const callExpression = initializer.asKind(SyntaxKind.CallExpression);
                    const args = callExpression?.getArguments();

                    if (args && args.length >= 2) {
                        const columnsObj = args[1]!.asKind(SyntaxKind.ObjectLiteralExpression);

                        if (columnsObj) {
                            let selectFields = '';
                            let insertFields = '';

                            // Globale Spreads auflösen
                            if (columnsObj.getText().includes('...Identifier')) {
                                selectFields += `  identifier: Type.String({ format: 'uuid' }),\n`;
                                insertFields += `  identifier: Type.Optional(Type.String({ format: 'uuid' })),\n`;
                            }
                            if (columnsObj.getText().includes('...timestamps')) {
                                selectFields += `  createdAt: Type.String(),\n`;
                                selectFields += `  updatedAt: Type.String(),\n`;

                                insertFields += `  createdAt: Type.Optional(Type.String()),\n`;
                                insertFields += `  updatedAt: Type.Optional(Type.String()),\n`;
                            }

                            // Einzelne Spalten analysieren
                            columnsObj.getProperties().forEach(prop => {
                                const propertyAssignment = prop.asKind(SyntaxKind.PropertyAssignment);
                                if (propertyAssignment) {
                                    const propName = propertyAssignment.getName();
                                    const propInit = propertyAssignment.getInitializer()?.getText() || '';
                                    const baseType = mapDrizzleTypeToTypeBox(propInit);

                                    // Select ist immer der volle Typ
                                    selectFields += `  ${propName}: Type.Any(${baseType}),\n`;

                                    // Insert prüft, ob die Spalte optional sein darf
                                    if (isOptionalForInsert(propInit)) {
                                        insertFields += `  ${propName}: Type.Optional(Type.Any(${baseType})),\n`;
                                    } else {
                                        insertFields += `  ${propName}: Type.Any(${baseType}),\n`;
                                    }
                                }
                            });

                            // 1. Select-Schema & Typ schreiben
                            drizzleContent += `export const ${pascalName}Schema = Type.Object({\n${selectFields}});\n`;
                            drizzleContent += `export type ${pascalName} = Static<typeof ${pascalName}Schema>;\n\n`;

                            // 2. Insert-Schema & Typ schreiben
                            drizzleContent += `export const ${pascalName}InsertSchema = Type.Object({\n${insertFields}});\n`;
                            drizzleContent += `export type ${pascalName}Insert = Static<typeof ${pascalName}InsertSchema>;\n\n`;
                        }
                    }
                }
            }
        }

        if (drizzleContent) {
            fileContent += `// --- Derived Drizzle Schemas ---\n` + drizzleContent;
            hasContent = true;
        }

        if (hasContent) {
            fs.writeFileSync(generatedFilePath, fileContent);
            console.log(`✅ Code generiert in: /src/types/_${fileName}`);
        }
    }
}

generate();
import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getFilesRecursively(dir: string, fileList: string[] = []): string[] {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            getFilesRecursively(filePath, fileList);
        } else if (file.endsWith('.tsx')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

describe('SVG motion components safety check', () => {
    test('no motion component should mix SVG transform attributes with Framer Motion animations', () => {
        const componentsDir = path.resolve(__dirname, '../components');
        const files = getFilesRecursively(componentsDir);
        const violations: string[] = [];

        for (const file of files) {
            const content = fs.readFileSync(file, 'utf-8');
            let index = 0;

            while (true) {
                index = content.indexOf('<motion.', index);
                if (index === -1) break;

                // Find the end of the opening tag (could span multiple lines)
                let tagEnd = -1;
                let braceCount = 0;
                let insideQuote: string | null = null;

                for (let i = index; i < content.length; i++) {
                    const char = content[i];
                    if (insideQuote) {
                        if (char === insideQuote) {
                            insideQuote = null;
                        }
                    } else if (char === '"' || char === "'" || char === '`') {
                        insideQuote = char;
                    } else if (char === '{') {
                        braceCount++;
                    } else if (char === '}') {
                        braceCount--;
                    } else if (char === '>' && braceCount === 0) {
                        tagEnd = i;
                        break;
                    }
                }

                if (tagEnd !== -1) {
                    const tagContent = content.substring(index, tagEnd + 1);
                    // Check if tagContent contains transform AND animate/initial/exit
                    const hasTransform = tagContent.includes('transform=');
                    const hasMotionAnim = tagContent.includes('animate=') || 
                                         tagContent.includes('initial=') || 
                                         tagContent.includes('exit=') ||
                                         tagContent.includes('whileHover=') ||
                                         tagContent.includes('whileTap=');

                    if (hasTransform && hasMotionAnim) {
                        // Get line number
                        const linesBefore = content.substring(0, index).split('\n');
                        const lineNum = linesBefore.length;
                        const relativePath = path.relative(process.cwd(), file);
                        violations.push(`${relativePath}:${lineNum} - Tag: ${tagContent.replace(/\s+/g, ' ')}`);
                    }
                }

                index += 8; // Move past '<motion.'
            }
        }

        if (violations.length > 0) {
            const errorMessage = `Found motion components mixing SVG "transform" attributes with Framer Motion animations:\n` +
                violations.map(v => `  - ${v}`).join('\n') +
                `\n\nFix: Wrap the <motion.xxx> element inside a standard <g transform="..."> element, or position it using Framer Motion style property instead of the transform attribute.`;
            expect(violations.length, errorMessage).toBe(0);
        }
    });
});

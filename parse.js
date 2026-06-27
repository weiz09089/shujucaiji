const fs = require('fs');
const path = require('path');

const txt = fs.readFileSync(path.join(__dirname, '..', '数据采集技术-复习题.txt'), 'utf-8');
const lines = txt.split('\n').map(l => l.trim()).filter(l => l);

const questions = { choice: [], judge: [], multiple: [] };
let currentMode = null;
let currentQ = null;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.match(/^一、\s*单项选择题/)) { currentMode = 'choice'; continue; }
    if (line.match(/^二、\s*判断题/)) { currentMode = 'judge'; continue; }
    if (line.match(/^三、\s*多项选择题/)) { currentMode = 'multiple'; continue; }
    
    if (currentMode === 'choice' || currentMode === 'multiple') {
        // Line starts with number dot, e.g. "1. 搜索引擎离不开(     )。 C"
        const qMatch = line.match(/^\d+[\.．]\s*(.*)$/);
        if (qMatch) {
            if (currentQ && currentQ.question) questions[currentMode].push(currentQ);
            
            let text = qMatch[1];
            // answer might be at the end of the line, like " C "
            // let's try to extract it. Usually A-D or A-E for multiple
            let answer = '';
            if (currentMode === 'choice') {
                const ansMatch = text.match(/\s+([A-D])\s*$/);
                if (ansMatch) {
                    answer = ansMatch[1];
                    text = text.substring(0, text.length - ansMatch[0].length).trim();
                }
            } else {
                // multiple choice could have multiple letters
                const ansMatch = text.match(/\s+([A-E]+)\s*$/);
                if (ansMatch) {
                    answer = ansMatch[1].split('');
                    text = text.substring(0, text.length - ansMatch[0].length).trim();
                }
            }
            
            currentQ = { type: currentMode, question: text, answer: answer, options: [] };
        } else if (line.match(/^[A-E][）\)]/)) {
            // Options line, could contain multiple options
            if (currentQ) {
                // Split by A) B) C) D) E)
                let temp = line;
                ['E', 'D', 'C', 'B', 'A'].forEach(letter => {
                    const regex = new RegExp(`${letter}[）\\)]\\s*`);
                    if (temp.match(regex)) {
                        const parts = temp.split(regex);
                        if (parts[1]) {
                            currentQ.options.unshift(parts[1].trim());
                        }
                        temp = parts[0];
                    }
                });
            }
        }
    } else if (currentMode === 'judge') {
        const qMatch = line.match(/^\d+[\.．]\s*(.*)$/);
        if (qMatch) {
            let text = qMatch[1];
            let answer = null;
            // Answer might be √ or ×, or F/T at the end
            if (text.match(/\s*[×F]\s*$/)) {
                answer = false;
                text = text.replace(/\s*[×F]\s*$/, '').trim();
            } else if (text.match(/\s*[√T]\s*$/)) {
                answer = true;
                text = text.replace(/\s*[√T]\s*$/, '').trim();
            } else if (text.includes('对') || text.includes('错')) {
                 if (text.match(/\s*错\s*$/)) {
                     answer = false; text = text.replace(/\s*错\s*$/, '').trim();
                 } else if (text.match(/\s*对\s*$/)) {
                     answer = true; text = text.replace(/\s*对\s*$/, '').trim();
                 }
            }
            
            if (answer !== null) {
                questions.judge.push({ type: 'judge', question: text, answer: answer });
            }
        }
    }
}
if (currentQ && currentQ.question) {
    questions[currentMode].push(currentQ);
}

const output = `const QUESTIONS = ${JSON.stringify(questions, null, 2)};`;
fs.writeFileSync(path.join(__dirname, 'questions.js'), output, 'utf-8');
console.log('Parsed data collection questions');

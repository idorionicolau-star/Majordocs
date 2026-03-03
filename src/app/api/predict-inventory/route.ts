import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(req: NextRequest) {
    try {
        const data = await req.json();

        if (!data.products || !data.movements) {
            return NextResponse.json({ error: "Produtos ou movimentos ausentes." }, { status: 400 });
        }

        const scriptPath = path.join(process.cwd(), 'src', 'lib', 'python', 'predict_inventory.py');
        const pythonProcess = spawn('python', [scriptPath]);

        const result = await new Promise((resolve, reject) => {
            let outputData = '';
            let errorData = '';

            pythonProcess.stdout.on('data', (chunk) => {
                outputData += chunk.toString();
            });

            pythonProcess.stderr.on('data', (chunk) => {
                errorData += chunk.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    console.error('Python Error:', errorData);
                    reject(new Error(`Python process exited with code ${code}`));
                    return;
                }

                try {
                    // Parse the final output from stdout
                    const parsed = JSON.parse(outputData);
                    resolve(parsed);
                } catch (e) {
                    console.error('JSON Parse Error:', outputData);
                    reject(new Error('Failed to parse Python output'));
                }
            });

            // Write data to python stdin
            pythonProcess.stdin.write(JSON.stringify(data));
            pythonProcess.stdin.end();
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Erro na API Preditiva:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

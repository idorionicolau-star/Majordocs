const { spawn } = require('child_process');
const path = require('path');

const mockData = {
    products: [
        { id: "1", name: "Apple", thresholdMode: "auto", lowStockThreshold: 10, criticalStockThreshold: 5 }
    ],
    movements: []
};

// Generate 30 days of high turnover data
const now = new Date();
for (let i = 0; i < 30; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    // Give high turnover (e.g. 10 items sold per day)
    for (let j = 0; j < 10; j++) {
        mockData.movements.push({
            productId: "1",
            productName: "Apple",
            type: "OUT",
            quantity: -1,
            // Pass as an ISO string
            timestamp: d.toISOString()
        });
    }
}

const scriptPath = path.join(__dirname, 'src', 'lib', 'python', 'predict_inventory.py');
const pythonProcess = spawn('python', [scriptPath]);

let outputData = '';
let errorData = '';

pythonProcess.stdout.on('data', chunk => outputData += chunk.toString());
pythonProcess.stderr.on('data', chunk => errorData += chunk.toString());

pythonProcess.on('close', code => {
    console.log("Exit Code:", code);
    console.log("Stdout:", outputData);
    console.log("Stderr:", errorData);
});

pythonProcess.stdin.write(JSON.stringify(mockData));
pythonProcess.stdin.end();

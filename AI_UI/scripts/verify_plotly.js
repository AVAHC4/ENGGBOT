const fetch = require('node-fetch');

async function verifyPlotly() {
    console.log('🧪 Starting Plotly Verification...');

    const payload = {
        message: "Create an interactive 3D surface plot of z = sin(x) * cos(y) using plotly. Use show_plotly(fig) to display it.",
        model: "z-ai/glm-4.5-air:free",
        thinkingMode: true,
        engineeringMode: true,
        conversationHistory: []
    };

    try {
        console.log('🚀 Sending request to local API...');
        const response = await fetch('http://localhost:3001/api/chat/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        console.log('📥 Receiving stream...');
        const reader = response.body;
        let fullText = '';

        // Simple stream reader for Node.js
        for await (const chunk of reader) {
            const text = chunk.toString();
            const lines = text.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.text) {
                            process.stdout.write(data.text);
                            fullText += data.text;
                        }
                    } catch (e) { }
                }
            }
        }

        console.log('\n\n🔍 Analyzing Response...');

        const hasPlotlyImport = fullText.includes('import plotly') || fullText.includes('from plotly');
        const hasShowPlotly = fullText.includes('show_plotly');

        if (hasPlotlyImport) {
            console.log('✅ Plotly Import Detected');
        } else {
            console.log('❌ No Plotly Import Found');
        }

        if (hasShowPlotly) {
            console.log('✅ show_plotly() Usage Detected');
        } else {
            console.log('❌ show_plotly() Not Used');
        }

    } catch (error) {
        console.error('❌ Verification Failed:', error);
    }
}

verifyPlotly();

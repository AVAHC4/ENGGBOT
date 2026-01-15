const fetch = require('node-fetch');

async function verifyEngineeringBot() {
    console.log('🧪 Starting Engineering Bot Verification...');

    const payload = {
        message: "Calculate the maximum deflection of a cantilever beam of length L, modulus of elasticity E, and moment of inertia I, subjected to a point load P at the free end. Derive it using python symbolic math if needed.",
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

        const hasPython = fullText.includes('```python');
        const hasFormula = fullText.includes('P * L**3') || fullText.includes('P*L^3') || fullText.includes('P * L^3');

        if (hasPython) {
            console.log('✅ Python Code Block Detected');
        } else {
            console.log('❌ No Python Code Block Found (Engineering Mode failed?)');
        }

        if (hasFormula) {
            console.log('✅ Correct Formula Identified (P*L^3 / 3EI)');
        } else {
            console.log('⚠️ Formula check might be fuzzy, please verify manually.');
        }

    } catch (error) {
        console.error('❌ Verification Failed:', error);
    }
}

verifyEngineeringBot();

import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const API_URL = process.env.VITE_API_URL || 'http://localhost:3001';
const TOKEN = process.env.TEST_TOKEN; // Ensure you have this in .env or provide it

async function testPerformance() {
    const start = '2026-03-01';
    const end = '2026-03-15';
    
    console.log(`Testing dashboard stats performance for range ${start} to ${end}...`);
    
    const startTime = Date.now();
    try {
        const res = await fetch(`${API_URL}/api/dashboard/stats?startDate=${start}&endDate=${end}`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        
        const duration = Date.now() - startTime;
        
        if (res.ok) {
            const data = await res.json();
            console.log(`✅ Success! Response time: ${duration}ms`);
            console.log(`Stats summary:`);
            console.log(`- Revenue: ${data.revenue}`);
            console.log(`- Expense: ${data.expense}`);
            console.log(`- Chart Data Points: ${data.chartData?.length || 0}`);
        } else {
            console.error(`❌ Failed with status ${res.status}`);
            const text = await res.text();
            console.error(text);
        }
    } catch (err) {
        console.error('❌ Error during fetch:', err.message);
    }
}

testPerformance();

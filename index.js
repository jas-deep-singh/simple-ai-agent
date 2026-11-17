import {GoogleGenAI} from '@google/genai';
import readlineSync from "readline-sync";
import dotenv from "dotenv";

dotenv.config();

const client = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
        apiVersion: "v1beta"
    }
});

function getWeatherDetails(city) {
    if(city.toLowerCase()==="patiala") return "10°C";
    if(city.toLowerCase()==="mohali") return "14°C";
    if(city.toLowerCase()==="bangalore") return "20°C";
    if(city.toLowerCase()==="chandigarh") return "8°C";
    if(city.toLowerCase()==="delhi") return "12°C";
    return "Weather information unavailable";
}

const tools = {
    "getWeatherDetails": getWeatherDetails
};

const SYSTEM_PROMPT = `
You are an AI Asistant with START, PLAN, ACTION, Observation and Output State.
Wait for the user prompt and first PLAN using available tools.
After Planning, Take the action with appropriate tools and wait for Observation based on Action.
Once you get the observations, Return the AI response based on START prompt and observations

Strictly follow the JSON output format as in examples

Available Tools:
- function getWeatherDetails(city: string): string
getWeatherDetails is a function that accepts city name as string and returns the weather details

Example:
START
{ "type": "user", "user": "What is the sum of weather of Patiala and Mohali" }
{ "type": "plan", "plan": "I will call the getWeatherDetails for Patiala" }
{ "type": "action", "function": "getWeatherDetails", "input": "patiala" }
{ "type": "observation", "observation": "10°C" }
{ "type": "plan", "plan": "I will call the getWeatherDetails for Mohali" }
{ "type": "action", "function": "getWeatherDetails", "input": "mohali" }
{ "type": "observation", "observation": "14°C" }
{ "type": "output", "output": "The sum of weather of Patiala and Mohali is 24°C" }
`;

const messages = [];

while(true) {
    const query = readlineSync.question(">> ");
    if(query.toLowerCase()==="exit") {
        break;
    }
    const q = {
        type: "user",
        user: query
    };
    messages.push({ role: "user", parts: [{text: query}] });

    while(true) {
        const chat = await client.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: messages,
            config: {
                systemInstruction: SYSTEM_PROMPT,
                responseMimeType: "application/json"
            }
        });
        const result = chat.text;
        messages.push({ role: "model", parts: [{text: result}] });
        const call = JSON.parse(result);
        if(call.type==="output") {
            console.log(`${call.output}`);
            break;
        } 
        else if(call.type==="action") {
            const fn = tools[call.function];
            if(!fn) {
                throw new Error(`Unknown function: ${call.function}`);
            }
            const observation = fn(call.input);
            messages.push({ role: "user", parts: [{text: JSON.stringify({
                type: "observation",
                observation: observation
            })}] });
        }
    }
}
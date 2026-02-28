import { GoogleGenerativeAI, Tool } from "@google/generative-ai";
import { callSomeone, searchContacts, setReminder } from "./actions";
import { getWeather } from "./weather";

const API_KEY = "AIzaSyCciqlBbeKS4p75OV_-3GyvRwxGM9LveDg";
const genAI = new GoogleGenerativeAI(API_KEY);

const tools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "get_weather",
        description:
          "Get the current weather for a specific city or current location.",
        parameters: {
          type: "object" as any,
          properties: {
            city: {
              type: "string" as any,
              description: "The city name, e.g., 'London'.",
            },
            lat: {
              type: "number" as any,
              description: "Latitude of the location.",
            },
            lon: {
              type: "number" as any,
              description: "Longitude of the location.",
            },
          },
        },
      },
      {
        name: "search_contacts",
        description: "Find a contact's phone number by their name.",
        parameters: {
          type: "object" as any,
          properties: {
            name: {
              type: "string" as any,
              description: "The name of the person to search for.",
            },
          },
          required: ["name"],
        },
      },
      {
        name: "call_someone",
        description: "Make a phone call to a given phone number.",
        parameters: {
          type: "object" as any,
          properties: {
            phoneNumber: {
              type: "string" as any,
              description: "The phone number to call.",
            },
          },
          required: ["phoneNumber"],
        },
      },
      {
        name: "set_reminder",
        description: "Set a reminder for a specific task and time.",
        parameters: {
          type: "object" as any,
          properties: {
            title: {
              type: "string" as any,
              description: "The title of the reminder.",
            },
            dateIso: {
              type: "string" as any,
              description: "The date and time in ISO 8601 format.",
            },
          },
          required: ["title", "dateIso"],
        },
      },
    ],
  },
];

// Initialize model without tools first
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-preview",
});

export async function processVoiceCommand(
  audioBase64: string,
  mimeType: string,
) {
  const chat = model.startChat({
    tools: tools,
  });

  const prompt = `You are a helpful assistant for seniors. 
  Listen to the voice command and perform the requested action. 
  - For weather: Use 'get_weather'.
  - For calling a person: FIRST use 'search_contacts' to find their number by name. If you find multiple numbers or none, inform the user. If you find exactly one, proceed to use 'call_someone' with that number.
  - For calling a direct number: Use 'call_someone' with the number.
  - For reminders: Use 'set_reminder'. Ensure the 'dateIso' is valid ISO 8601. Current time is ${new Date().toLocaleString()}.
  
  Keep your final vocal response concise and friendly.`;

  const result = await chat.sendMessage([
    { text: prompt },
    {
      inlineData: {
        mimeType: mimeType,
        data: audioBase64,
      },
    },
  ]);

  let response = result.response;
  let call = response.functionCalls()?.[0];

  // Loop to handle potential multiple function calls (e.g., search -> call)
  while (call) {
    const { name, args } = call;
    const typedArgs = args as any;
    let functionResponse;

    try {
      if (name === "get_weather") {
        functionResponse = await getWeather(
          typedArgs.city,
          typedArgs.lat,
          typedArgs.lon,
        );
      } else if (name === "search_contacts") {
        functionResponse = await searchContacts(typedArgs.name);
      } else if (name === "call_someone") {
        functionResponse = await callSomeone(typedArgs.phoneNumber);
      } else if (name === "set_reminder") {
        console.log("setreminder1");
        functionResponse = await setReminder(
          typedArgs.title,
          typedArgs.dateIso,
        );
      }

      const followup = await chat.sendMessage([
        {
          functionResponse: {
            name,
            response: { result: functionResponse },
          },
        },
      ]);

      response = followup.response;
      call = response.functionCalls()?.[0];
    } catch (error: any) {
      const errorFollowup = await chat.sendMessage([
        {
          functionResponse: {
            name,
            response: { error: error.message },
          },
        },
      ]);
      response = errorFollowup.response;
      call = response.functionCalls()?.[0];
    }
  }

  return response.text();
}

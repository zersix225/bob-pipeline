// src/granite.ts
import axios from "axios";

async function getAccessToken(): Promise<string> {
  const { data } = await axios.post(
    "https://iam.cloud.ibm.com/identity/token",
    new URLSearchParams({
      grant_type: "urn:ibm:params:oauth:grant-type:apikey",
      apikey: process.env.WATSONX_API_KEY!,
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );
  return data.access_token;
}

export async function askGranite(question: string): Promise<string> {
  const token = await getAccessToken();

  const { data } = await axios.post(
    `${process.env.WATSONX_URL}/ml/v1/text/chat?version=2024-05-31`,
    {
      model_id: "ibm/granite-3-8b-instruct",
      project_id: process.env.WATSONX_PROJECT_ID,
      messages: [
        { role: "user", content: question }
      ],
      parameters: { max_new_tokens: 512 }
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  return data.choices[0].message.content;
}
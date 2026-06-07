import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;
const baseURL = process.env.OPENAI_API_BASE;

export const openai = new OpenAI({
  apiKey: apiKey ?? "dummy",
  ...(baseURL ? { baseURL } : {}),
});

export async function generateSiteHtml(description: string, title: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-5.1",
    messages: [
      {
        role: "system",
        content: `You are an expert web developer. Generate a complete, beautiful, modern HTML page based on the user's description.
Output ONLY the complete HTML document (starting with <!DOCTYPE html>) with no explanation or markdown code blocks.
Requirements:
- Use modern CSS (flexbox, grid, CSS variables, animations)
- Include Tailwind CSS via CDN for styling
- Make it visually impressive and professional
- Ensure it is fully responsive (mobile + desktop)
- Add realistic placeholder content that fits the description
- Use a coherent color palette and typography
- Do not use any external images that might not load
- Use CSS gradients, shapes, and icons from Heroicons (CDN available) for visuals
- Include subtle animations and hover effects
- The page should be fully self-contained (all CSS/JS inline or via CDN)`,
      },
      {
        role: "user",
        content: `Create a website with the title "${title}" and this description:\n\n${description}`,
      },
    ],
    max_tokens: 4096,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("AI did not generate any content");
  }

  let html = content.trim();
  if (html.startsWith("```html")) {
    html = html.slice(7);
  } else if (html.startsWith("```")) {
    html = html.slice(3);
  }
  if (html.endsWith("```")) {
    html = html.slice(0, -3);
  }

  return html.trim();
}

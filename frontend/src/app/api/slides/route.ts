import { NextApiRequest, NextApiResponse } from 'next';
import { Configuration, OpenAIApi } from 'openai';
import fetch from 'node-fetch';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { pageCount, topic, audience, tone, language } = req.body;

  if (!pageCount || !topic || !audience || !tone || !language) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const slides = [];

    for (let i = 0; i < pageCount; i++) {
      const prompt = `Create a slide for a presentation on the topic "${topic}" for an audience of "${audience}" with a tone of "${tone}" in "${language}". Slide number ${i + 1}.`;

      const aiResponse = await openai.createCompletion({
        model: 'text-davinci-003',
        prompt,
        max_tokens: 150,
      });

      const slideContent = aiResponse.data.choices[0].text.trim();

      const imageResponse = await fetch(`https://api.unsplash.com/photos/random?query=${encodeURIComponent(topic)}&client_id=${process.env.UNSPLASH_ACCESS_KEY}`);
      const imageData = await imageResponse.json();
      const imageUrl = imageData.urls.small;

      slides.push({
        id: i + 1,
        content: slideContent,
        image: imageUrl,
      });
    }

    res.status(200).json({ slides });
  } catch (error) {
    console.error('Error generating slides:', error);
    res.status(500).json({ error: 'Failed to generate slides' });
  }
};

export default handler;

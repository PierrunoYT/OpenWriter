import { NextApiRequest, NextApiResponse } from 'next';
import { Configuration, OpenAIApi } from 'openai';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query;

  if (req.method === 'GET') {
    // Fetch specific slide
    try {
      const slide = await getSlideById(id as string);
      if (!slide) {
        return res.status(404).json({ error: 'Slide not found' });
      }
      res.status(200).json(slide);
    } catch (error) {
      console.error('Error fetching slide:', error);
      res.status(500).json({ error: 'Failed to fetch slide' });
    }
  } else if (req.method === 'POST') {
    // Rework specific slide
    const { pageContent, topic, audience, tone, language } = req.body;

    if (!pageContent || !topic || !audience || !tone || !language) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const prompt = `Rework the following slide content for a presentation on the topic "${topic}" for an audience of "${audience}" with a tone of "${tone}" in "${language}". Slide content: "${pageContent}"`;

      const aiResponse = await openai.createCompletion({
        model: 'text-davinci-003',
        prompt,
        max_tokens: 150,
      });

      const reworkedContent = aiResponse.data.choices[0].text.trim();

      res.status(200).json({ reworkedContent });
    } catch (error) {
      console.error('Error reworking slide:', error);
      res.status(500).json({ error: 'Failed to rework slide' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

const getSlideById = async (id: string) => {
  // Placeholder function to fetch slide by ID
  // Replace with actual implementation
  return {
    id,
    content: 'Sample slide content',
    image: 'https://example.com/sample-image.jpg',
  };
};

export default handler;

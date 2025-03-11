import React, { useState } from 'react';
import { useTheme } from '@/app/providers';

interface Slide {
  id: number;
  content: string;
  image: string;
}

const Slides = () => {
  const { theme } = useTheme();
  const [pageCount, setPageCount] = useState<number>(1);
  const [topic, setTopic] = useState<string>('');
  const [audience, setAudience] = useState<string>('');
  const [tone, setTone] = useState<string>('');
  const [language, setLanguage] = useState<string>('English');
  const [slides, setSlides] = useState<Slide[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleGenerateSlides = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/slides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pageCount,
          topic,
          audience,
          tone,
          language,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate slides');
      }

      const data = await response.json();
      setSlides(data.slides);
    } catch (error) {
      console.error('Error generating slides:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'pptx') => {
    try {
      const response = await fetch(`/api/slides/export?format=${format}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slides }),
      });

      if (!response.ok) {
        throw new Error(`Failed to export slides as ${format}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `slides.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error(`Error exporting slides as ${format}:`, error);
    }
  };

  return (
    <div className={`min-h-screen p-6 ${theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
      <h1 className="text-2xl font-bold mb-4">Generate Slides</h1>
      <div className="mb-4">
        <label className="block mb-2">Page Count</label>
        <input
          type="number"
          value={pageCount}
          onChange={(e) => setPageCount(Number(e.target.value))}
          className="w-full p-2 border border-slate-300 rounded"
        />
      </div>
      <div className="mb-4">
        <label className="block mb-2">Topic</label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="w-full p-2 border border-slate-300 rounded"
        />
      </div>
      <div className="mb-4">
        <label className="block mb-2">Audience</label>
        <input
          type="text"
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          className="w-full p-2 border border-slate-300 rounded"
        />
      </div>
      <div className="mb-4">
        <label className="block mb-2">Tone</label>
        <input
          type="text"
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          className="w-full p-2 border border-slate-300 rounded"
        />
      </div>
      <div className="mb-4">
        <label className="block mb-2">Language</label>
        <input
          type="text"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full p-2 border border-slate-300 rounded"
        />
      </div>
      <button
        onClick={handleGenerateSlides}
        disabled={isLoading}
        className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
      >
        {isLoading ? 'Generating...' : 'Generate Slides'}
      </button>
      <div className="mt-6">
        <h2 className="text-xl font-bold mb-4">Generated Slides</h2>
        {slides.length === 0 ? (
          <p>No slides generated yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {slides.map((slide) => (
              <div key={slide.id} className="border p-4 rounded">
                <p>{slide.content}</p>
                {slide.image && <img src={slide.image} alt="Slide" className="mt-2" />}
              </div>
            ))}
          </div>
        )}
      </div>
      {slides.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-bold mb-4">Export Slides</h2>
          <button
            onClick={() => handleExport('pdf')}
            className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 mr-2"
          >
            Export as PDF
          </button>
          <button
            onClick={() => handleExport('pptx')}
            className="bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700"
          >
            Export as PPTX
          </button>
        </div>
      )}
    </div>
  );
};

export default Slides;

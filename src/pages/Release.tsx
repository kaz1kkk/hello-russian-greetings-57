
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Apple, Youtube, Spotify, Share } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Release {
  title: string;
  cover_url: string;
  links_by_platform: {
    [key: string]: { url: string; }
  };
}

export default function Release() {
  const { slug } = useParams();
  const [release, setRelease] = useState<Release | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRelease() {
      const { data, error } = await supabase
        .from('releases')
        .select()
        .eq('slug', slug)
        .single();

      if (error) {
        console.error('Error:', error);
        return;
      }

      setRelease(data);
      setIsLoading(false);
    }

    fetchRelease();
  }, [slug]);

  if (isLoading) return null;
  if (!release) return <div>Релиз не найден</div>;

  const platformIcons = {
    spotify: <Spotify className="w-5 h-5" />,
    appleMusic: <Apple className="w-5 h-5" />,
    youtube: <Youtube className="w-5 h-5" />
  };

  const platformColors = {
    spotify: "bg-[#1DB954] hover:bg-[#1ed760]",
    appleMusic: "bg-[#fb233b] hover:bg-[#ff2d43]",
    youtube: "bg-[#FF0000] hover:bg-[#ff1a1a]"
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black to-white p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center">
          <img 
            src={release.cover_url} 
            alt={release.title}
            className="w-64 h-64 rounded-lg shadow-2xl"
          />
          <h1 className="mt-6 text-2xl font-medium text-center">{release.title}</h1>
        </div>

        <div className="space-y-4">
          {Object.entries(release.links_by_platform).map(([platform, { url }]) => (
            <Button
              key={platform}
              className={`w-full ${platformColors[platform as keyof typeof platformColors] || "bg-gray-600 hover:bg-gray-700"}`}
              asChild
            >
              <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                {platformIcons[platform as keyof typeof platformIcons]}
                {platform === "spotify" ? "Слушать в Spotify" :
                 platform === "appleMusic" ? "Слушать в Apple Music" :
                 platform === "youtube" ? "Смотреть на YouTube" :
                 `Открыть в ${platform}`}
              </a>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

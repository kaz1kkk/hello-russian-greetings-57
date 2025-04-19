
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Apple, Youtube, Music, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Release {
  title: string;
  artist: string;
  cover_url: string;
  links_by_platform: {
    [key: string]: { url: string; }
  };
}

const ALLOWED_PLATFORMS = {
  spotify: {
    name: "Spotify",
    icon: <Music className="w-6 h-6" />,
    color: "bg-gradient-to-br from-[#1DB954]/90 to-[#1DB954]/70 hover:from-[#1DB954] hover:to-[#1DB954]"
  },
  appleMusic: {
    name: "Apple Music",
    icon: <Apple className="w-6 h-6" />,
    color: "bg-gradient-to-br from-[#fb233b]/90 to-[#fb233b]/70 hover:from-[#fb233b] hover:to-[#fb233b]"
  },
  youtubeMusic: {
    name: "YouTube Music",
    icon: <Youtube className="w-6 h-6" />,
    color: "bg-gradient-to-br from-[#FF0000]/90 to-[#FF0000]/70 hover:from-[#FF0000] hover:to-[#FF0000]"
  },
  yandex: {
    name: "Яндекс Музыка",
    icon: <Music className="w-6 h-6" />,
    color: "bg-gradient-to-br from-[#FFCC00]/90 to-[#FFCC00]/70 hover:from-[#FFCC00] hover:to-[#FFCC00] text-black"
  },
  soundcloud: {
    name: "SoundCloud",
    icon: <Music className="w-6 h-6" />,
    color: "bg-gradient-to-br from-[#ff5500]/90 to-[#ff5500]/70 hover:from-[#ff5500] hover:to-[#ff5500]"
  },
  vk: {
    name: "VK Музыка",
    icon: <Music className="w-6 h-6" />,
    color: "bg-gradient-to-br from-[#0077FF]/90 to-[#0077FF]/70 hover:from-[#0077FF] hover:to-[#0077FF]"
  }
};

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

      // Cast the JSON data to our expected type
      const links = typeof data.links_by_platform === 'string' 
        ? JSON.parse(data.links_by_platform) 
        : data.links_by_platform;

      setRelease({
        title: data.title,
        artist: data.artist || "Unknown Artist", // Provide default in case artist is missing
        cover_url: data.cover_url,
        links_by_platform: links
      });
      setIsLoading(false);
    }

    fetchRelease();
  }, [slug]);

  if (isLoading) return null;
  if (!release) return <div>Релиз не найден</div>;

  const handleShare = async () => {
    const currentUrl = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: release.title,
          text: `Слушай релиз "${release.title}" на любимой платформе`,
          url: currentUrl,
        });
      } catch (error) {
        console.error('Ошибка при шаринге:', error);
      }
    } else {
      navigator.clipboard.writeText(currentUrl)
        .then(() => toast.success("Ссылка скопирована в буфер обмена"))
        .catch(() => toast.error("Не удалось скопировать ссылку"));
    }
  };

  const filteredLinks = Object.entries(release.links_by_platform)
    .filter(([platform]) => platform in ALLOWED_PLATFORMS)
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-zinc-900 to-zinc-800 text-white p-4">
      <div className="w-full max-w-md space-y-8 backdrop-blur-lg bg-white/5 p-8 rounded-2xl border border-white/10">
        <div className="flex flex-col items-center">
          <div className="relative group">
            <img 
              src={release.cover_url} 
              alt={release.title}
              className="w-64 h-64 rounded-xl shadow-2xl transition-transform duration-300 group-hover:scale-[1.02]"
            />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
          </div>
          
          <div className="mt-6 text-center space-y-2">
            <h1 className="text-2xl font-medium bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
              {release.title}
            </h1>
            <p className="text-lg text-zinc-400">{release.artist}</p>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="mt-4 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors" 
            onClick={handleShare}
          >
            <Share className="w-5 h-5" />
          </Button>
        </div>

        <div className="space-y-3">
          {filteredLinks.map(([platform, { url }]) => {
            const platformConfig = ALLOWED_PLATFORMS[platform as keyof typeof ALLOWED_PLATFORMS];
            return (
              <Button
                key={platform}
                className={`w-full ${platformConfig.color} transition-all duration-300 ease-in-out 
                  shadow-lg hover:shadow-xl text-white 
                  border border-white/10 hover:border-white/20`}
                asChild
              >
                <a 
                  href={url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center justify-center gap-3 py-6"
                >
                  {platformConfig.icon}
                  <span className="text-base">
                    {`Слушать в ${platformConfig.name}`}
                  </span>
                </a>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}


import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Apple, Youtube, Music, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Release {
  title: string;
  artist: string; // We'll keep this in the interface
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

      // If artist doesn't exist in data, use a fallback value
      setRelease({
        title: data.title,
        artist: data.artist || "Unknown Artist", // Add fallback for missing artist field
        cover_url: data.cover_url,
        links_by_platform: data.links_by_platform as { [key: string]: { url: string } }
      });
      setIsLoading(false);
    }

    fetchRelease();
  }, [slug]);

  if (isLoading) return null;
  if (!release) return <div>Релиз не найден</div>;

  const platformIcons = {
    spotify: <Music className="w-6 h-6" />,
    appleMusic: <Apple className="w-6 h-6" />,
    youtube: <Youtube className="w-6 h-6" />
  };

  const platformColors = {
    spotify: "bg-[#1DB954]/90 hover:bg-[#1DB954]",
    appleMusic: "bg-[#fb233b]/90 hover:bg-[#fb233b]",
    youtube: "bg-[#FF0000]/90 hover:bg-[#FF0000]"
  };

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
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(currentUrl)
        .then(() => toast.success("Ссылка скопирована в буфер обмена"))
        .catch(() => toast.error("Не удалось скопировать ссылку"));
    }
  };

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
          {Object.entries(release.links_by_platform).map(([platform, { url }]) => (
            <Button
              key={platform}
              className={`w-full ${platformColors[platform as keyof typeof platformColors] || "bg-zinc-600/90 hover:bg-zinc-600"} transition-colors duration-300`}
              asChild
            >
              <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center justify-center gap-3 py-6"
              >
                {platformIcons[platform as keyof typeof platformIcons]}
                <span className="text-base">
                  {platform === "spotify" ? "Слушать в Spotify" :
                   platform === "appleMusic" ? "Слушать в Apple Music" :
                   platform === "youtube" ? "Смотреть на YouTube" :
                   `Открыть в ${platform}`}
                </span>
              </a>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

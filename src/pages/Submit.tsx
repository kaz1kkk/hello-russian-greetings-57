
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Submit() {
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  const validateSpotifyUrl = (url: string) => {
    // Basic validation for Spotify URLs
    return url.includes('spotify.com/') && (url.includes('/track/') || url.includes('/album/'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    
    // Validate Spotify URL format
    if (!validateSpotifyUrl(spotifyUrl)) {
      setErrorMessage("Пожалуйста, введите корректную ссылку на трек или альбом Spotify");
      toast.error("Неверный формат ссылки Spotify");
      return;
    }
    
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-release', {
        body: { spotifyUrl }
      });

      if (error) throw new Error(error.message);
      if (!data || !data.slug) throw new Error("Не удалось создать релиз");
      
      toast.success("Релиз успешно создан!");
      navigate(`/${data.slug}`);
    } catch (error: any) {
      console.error('Error:', error);
      setErrorMessage(error.message || "Ошибка при создании релиза");
      toast.error(error.message || "Ошибка при создании релиза");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-zinc-900 to-zinc-800 p-4">
      <div className="w-full max-w-md space-y-6 backdrop-blur-lg bg-white/5 p-8 rounded-2xl border border-white/10">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-medium text-white">Создать мульти-линк</h1>
          <p className="text-zinc-400">Вставьте ссылку на трек или альбом из Spotify</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <input
              type="text"
              value={spotifyUrl}
              onChange={(e) => setSpotifyUrl(e.target.value)}
              placeholder="https://open.spotify.com/track/..."
              className="w-full p-4 rounded-lg bg-white/10 border border-white/10 text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-white/20 focus:border-transparent"
            />
            {errorMessage && (
              <p className="text-sm text-red-400">{errorMessage}</p>
            )}
            <p className="text-xs text-zinc-500">
              Пример: https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT
            </p>
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-white/10 hover:bg-white/20 text-white py-6"
            disabled={isLoading}
          >
            {isLoading ? "Создаем..." : "Создать мульти-линк"}
          </Button>
        </form>
      </div>
    </div>
  );
}

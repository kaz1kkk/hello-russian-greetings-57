
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Submit() {
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-release', {
        body: { spotifyUrl }
      });

      if (error) throw error;
      
      toast.success("Релиз успешно создан!");
      navigate(`/${data.slug}`);
    } catch (error) {
      console.error('Error:', error);
      toast.error("Ошибка при создании релиза");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black to-white p-4">
      <div className="w-full max-w-md">
        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="text"
            value={spotifyUrl}
            onChange={(e) => setSpotifyUrl(e.target.value)}
            placeholder="Вставьте ссылку на Spotify релиз"
            className="w-full p-4 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent"
          />
          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Создаем..." : "Создать мульти-линк"}
          </Button>
        </form>
      </div>
    </div>
  );
}

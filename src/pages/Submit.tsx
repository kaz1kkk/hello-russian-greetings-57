
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

export default function Submit() {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  const validateInput = (value: string) => {
    // Check if it's a Spotify URL
    if (value.includes('spotify.com/')) {
      return value.includes('/track/') || value.includes('/album/');
    }
    
    // Check if it's a UPC/EAN code (12-13 digits)
    return /^\d{12,13}$/.test(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    
    if (!validateInput(input)) {
      setErrorMessage("Пожалуйста, введите корректную ссылку Spotify или UPC/EAN код (12-13 цифр)");
      toast.error("Неверный формат ввода");
      return;
    }
    
    setIsLoading(true);

    try {
      // Determine if the input is a Spotify URL or UPC
      const isSpotifyUrl = input.includes('spotify.com/');
      
      const requestBody = isSpotifyUrl 
        ? { spotifyUrl: input } 
        : { upc: input };
      
      const { data, error } = await supabase.functions.invoke('generate-release', {
        body: requestBody
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
          <p className="text-zinc-400">Используйте Spotify ссылку или UPC/EAN код</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Spotify URL или UPC/EAN код"
              className="w-full bg-white/10 border-white/10 text-white placeholder:text-zinc-500"
            />
            <p className="text-xs text-zinc-500">
              Примеры: https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT или 0888880123456
            </p>
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-white/10 hover:bg-white/20 text-white py-6"
            disabled={isLoading}
          >
            {isLoading ? "Создаем..." : "Создать мульти-линк"}
          </Button>
          
          {errorMessage && (
            <p className="text-sm text-red-400 text-center">{errorMessage}</p>
          )}
        </form>
      </div>
    </div>
  );
}

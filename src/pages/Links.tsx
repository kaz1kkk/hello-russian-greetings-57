
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { RefreshCcw, Trash2, Save } from "lucide-react";

export default function Links() {
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rescanningId, setRescanningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingRedirectId, setEditingRedirectId] = useState<string | null>(null);
  const [redirectInputs, setRedirectInputs] = useState<{ [key: string]: string }>({});
  const [savingRedirectId, setSavingRedirectId] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("releases")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLinks(data || []);
      // Initialize redirect inputs with current redirect_url
      const redirects: { [key: string]: string } = {};
      (data || []).forEach((link) => {
        redirects[link.id] = link.redirect_url || "";
      });
      setRedirectInputs(redirects);
    } catch (error: any) {
      console.error("Error fetching links:", error);
      toast.error("Не удалось загрузить ссылки");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      console.log("Deleting link id:", id);

      const { data, error } = await supabase
        .from("releases")
        .delete()
        .eq("id", id)
        .select()
        .maybeSingle();

      if (error) {
        console.error("Supabase deletion error:", error);
        toast.error(`Не удалось удалить ссылку: ${error.message}`);
        return;
      }

      if (!data) {
        toast.error("Ссылка не найдена для удаления");
        return;
      }

      await fetchLinks();

      toast.success("Ссылка удалена");

      if (location.pathname === `/${data.slug}`) {
        navigate("/");
      }
    } catch (error: any) {
      console.error("Error deleting link:", error);
      toast.error("Не удалось удалить ссылку");
    } finally {
      setDeletingId(null);
    }
  };

  const handleRescan = async (id: string) => {
    try {
      setRescanningId(id);
      const link = links.find((l) => l.id === id);
      if (!link) throw new Error("Ссылка не найдена");

      const { error } = await supabase.functions.invoke("generate-release", {
        body: {
          spotifyUrl: link.spotify_url,
          platforms: {
            spotify: true,
            appleMusic: true,
            youtubeMusic: true,
          },
        },
      });

      if (error) throw error;

      toast.success("Ссылка обновлена");
      await fetchLinks();
    } catch (error: any) {
      console.error("Error rescanning link:", error);
      toast.error("Не удалось обновить ссылку");
    } finally {
      setRescanningId(null);
    }
  };

  const handleRedirectChange = (id: string, value: string) => {
    setRedirectInputs((prev) => ({ ...prev, [id]: value }));
  };

  const handleRedirectEditToggle = (id: string) => {
    if (editingRedirectId === id) {
      setEditingRedirectId(null);
    } else {
      setEditingRedirectId(id);
    }
  };

  const handleRedirectSave = async (id: string) => {
    try {
      setSavingRedirectId(id);
      const redirectUrl = redirectInputs[id].trim();

      const { error } = await supabase
        .from("releases")
        .update({ redirect_url: redirectUrl.length > 0 ? redirectUrl : null })
        .eq("id", id);

      if (error) {
        console.error("Failed to update redirect URL:", error);
        toast.error("Не удалось сохранить редирект");
        return;
      }

      toast.success("Редирект сохранён");
      setEditingRedirectId(null);
      await fetchLinks();
    } catch (error: any) {
      console.error("Error saving redirect URL:", error);
      toast.error("Не удалось сохранить редирект");
    } finally {
      setSavingRedirectId(null);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-medium mb-2">Все ссылки</h1>
        <p className="text-muted-foreground">Список всех созданных вами мульти-ссылок</p>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <p>Загрузка...</p>
        </div>
      ) : links.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Слаг</TableHead>
              <TableHead>Название</TableHead>
              <TableHead>Дата создания</TableHead>
              <TableHead>Редирект (URL)</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {links.map((link) => (
              <TableRow key={link.id}>
                <TableCell className="font-medium">{link.slug}</TableCell>
                <TableCell>{link.title || "Без названия"}</TableCell>
                <TableCell>
                  {new Date(link.created_at).toLocaleDateString("ru-RU")}
                </TableCell>
                <TableCell>
                  {editingRedirectId === link.id ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        className="w-full rounded-md border border-input px-3 py-1 text-sm"
                        value={redirectInputs[link.id] || ""}
                        onChange={(e) =>
                          handleRedirectChange(link.id, e.target.value)
                        }
                        placeholder="Введите URL для редиректа или оставьте пустым"
                        autoFocus
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRedirectSave(link.id)}
                        disabled={savingRedirectId === link.id}
                      >
                        {savingRedirectId === link.id ? (
                          <span className="animate-spin">⟳</span>
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingRedirectId(null)}
                      >
                        Отмена
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="truncate max-w-[200px] block">
                        {link.redirect_url || (
                          <span className="text-muted-foreground italic">
                            не задан
                          </span>
                        )}
                      </span>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => handleRedirectEditToggle(link.id)}
                      >
                        Изменить
                      </Button>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/${link.slug}`}>Открыть</Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRescan(link.id)}
                    disabled={rescanningId === link.id}
                  >
                    {rescanningId === link.id ? (
                      <span className="animate-spin">⟳</span>
                    ) : (
                      <RefreshCcw className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(link.id)}
                    disabled={deletingId === link.id}
                    className="text-destructive hover:text-destructive"
                  >
                    {deletingId === link.id ? (
                      <span className="animate-spin">⟳</span>
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center p-8 bg-muted/50 rounded-lg">
          <p className="mb-4">У вас пока нет созданных ссылок</p>
          <Button asChild>
            <Link to="/submit">Создать первую ссылку</Link>
          </Button>
        </div>
      )}
    </div>
  );
}


import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { slugify } from 'https://deno.land/x/slugify@0.3.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { spotifyUrl } = await req.json();
    const encodedUrl = encodeURIComponent(spotifyUrl);
    
    // Fetch data from Odesli API
    const response = await fetch(`https://api.song.link/v1-alpha.1/links?url=${encodedUrl}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error('Failed to fetch from Odesli');
    }

    // Extract necessary data
    const title = data.entitiesByUniqueId[Object.keys(data.entitiesByUniqueId)[0]].title;
    const coverUrl = data.entitiesByUniqueId[Object.keys(data.entitiesByUniqueId)[0]].thumbnailUrl;
    const linksByPlatform = {};

    // Process platform links
    Object.entries(data.linksByPlatform).forEach(([platform, linkData]) => {
      linksByPlatform[platform] = {
        url: linkData.url
      };
    });

    // Create slug from title
    const slug = slugify(title);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Save to database
    const { error: dbError } = await supabase
      .from('releases')
      .insert({
        slug,
        title,
        cover_url: coverUrl,
        spotify_url: spotifyUrl,
        links_by_platform: linksByPlatform
      });

    if (dbError) throw dbError;

    return new Response(
      JSON.stringify({ slug }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

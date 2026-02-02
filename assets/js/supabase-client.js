
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// TODO: Replace with your actual Supabase URL and Key
// It is recommended to not hardcode these in production, but for a simple static site this is the common way.
// Ensure your Row Level Security (RLS) policies are set up correctly.

export const supabaseUrl = 'https://pkxwetxcvrovsjybuhpz.supabase.co';
export const supabaseKey = 'sb_publishable_yxAS11dBVeVsVmasqKNsEQ_Y5Q2Niov';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Example function to fetch content
export async function fetchContent(key) {
    const { data, error } = await supabase
        .from('site_content')
        .select('value')
        .eq('key', key)
        .maybeSingle();

    if (error) {
        console.error('Error fetching content:', error);
        return null;
    }
    return data?.value;
}

// Example function to save content
export async function saveContent(key, value) {
    const { data, error } = await supabase
        .from('site_content')
        .upsert({ key, value }, { onConflict: 'key' })
        .select();

    if (error) {
        console.error('Error saving content:', error);
        return { error };
    }
    return { data };
}

// Fetch all site content as a key-value map
export async function fetchAllContent() {
    const { data, error } = await supabase
        .from('site_content')
        .select('key, value');

    if (error) {
        console.error('Error fetching all content:', error);
        return {};
    }

    const contentMap = {};
    if (data) {
        data.forEach(item => {
            contentMap[item.key] = item.value;
        });
    }
    return contentMap;
}

// Delete a content entry by key
export async function deleteContent(key) {
    const { error } = await supabase
        .from('site_content')
        .delete()
        .eq('key', key);

    if (error) {
        console.error('Error deleting content:', error);
        return { error };
    }
    return { success: true };
}

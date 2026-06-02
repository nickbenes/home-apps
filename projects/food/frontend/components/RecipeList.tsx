import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ExternalLink, Tag } from 'lucide-react';
import { api } from '../lib/api';
import type { Recipe } from '../lib/types';

function parseTags(tags: string): string[] {
  try { return JSON.parse(tags); } catch { return []; }
}

function ImportUrlForm({ onImported }: { onImported: (r: Recipe) => void }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    try {
      const recipe = await api.recipes.importUrl(url.trim());
      onImported(recipe);
      setUrl('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-start">
      <input
        type="url"
        placeholder="Paste recipe URL to import…"
        value={url}
        onChange={e => setUrl(e.target.value)}
        className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
      />
      <button
        type="submit"
        disabled={loading || !url.trim()}
        className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 whitespace-nowrap"
      >
        {loading ? 'Importing…' : 'Import'}
      </button>
      {error && <p className="absolute mt-10 text-xs text-red-600">{error}</p>}
    </form>
  );
}

export default function RecipeList() {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useEffect(() => {
    api.recipes.list().then(r => { setRecipes(r); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const allTags = Array.from(new Set(recipes.flatMap(r => parseTags(r.tags)))).sort();

  const filtered = recipes.filter(r => {
    const matchesSearch = !search.trim() ||
      r.title.toLowerCase().includes(search.toLowerCase());
    const matchesTag = !activeTag || parseTags(r.tags).includes(activeTag);
    return matchesSearch && matchesTag;
  });

  return (
    <div className="p-4 lg:p-6">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Recipes</h1>
        <button
          onClick={() => setShowImport(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 ml-auto"
        >
          <Plus size={14} /> Import from URL
        </button>
      </div>

      {showImport && (
        <div className="mb-5 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <ImportUrlForm
            onImported={recipe => {
              setRecipes(prev => [recipe, ...prev]);
              setShowImport(false);
            }}
          />
        </div>
      )}

      {/* Search + tag filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search recipes…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-400 w-52"
          />
        </div>
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Tag size={12} className="text-gray-400" />
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setActiveTag(t => t === tag ? null : tag)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors
                  ${activeTag === tag
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'
                  }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && <p className="text-sm text-gray-500">Loading…</p>}

      {!loading && recipes.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg mb-2">No recipes yet.</p>
          <p className="text-sm">Import one from a URL to get started.</p>
        </div>
      )}

      {!loading && recipes.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-gray-500 py-8 text-center">
          No recipes match your search.
        </p>
      )}

      {/* Recipe grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map(recipe => {
          const tags = parseTags(recipe.tags);
          return (
            <div
              key={recipe.id}
              onClick={() => navigate(`/recipes/${recipe.id}`)}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-green-200 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-medium text-gray-900 leading-snug">{recipe.title}</h3>
                {recipe.source_url && (
                  <a href={recipe.source_url} target="_blank" rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="shrink-0 text-gray-400 hover:text-green-600">
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>
              {recipe.notes && (
                <p className="text-xs text-gray-500 mb-2 line-clamp-2">{recipe.notes}</p>
              )}
              <div className="flex items-center justify-between mt-auto">
                <span className="text-xs text-gray-400">Serves {recipe.servings}</span>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-end">
                    {tags.slice(0, 3).map(tag => (
                      <button
                        key={tag}
                        onClick={() => setActiveTag(t => t === tag ? null : tag)}
                        className={`text-xs px-1.5 py-0.5 rounded-full
                          ${activeTag === tag
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500 hover:bg-green-50'
                          }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

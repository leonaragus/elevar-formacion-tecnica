'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function StarRating({ claseId }: { claseId: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [average, setAverage] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    loadRating();
  }, [claseId]);

  async function loadRating() {
    // 1. Get average
    const { data: allRatings } = await supabase
      .from('clases_valoraciones')
      .select('valoracion')
      .eq('clase_id', claseId);

    if (allRatings && allRatings.length > 0) {
      const sum = allRatings.reduce((a, b) => a + b.valoracion, 0);
      setAverage(sum / allRatings.length);
      setCount(allRatings.length);
    } else {
      setAverage(0);
      setCount(0);
    }

    // 2. Get user rating
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: myRating } = await supabase
        .from('clases_valoraciones')
        .select('valoracion')
        .eq('clase_id', claseId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (myRating) {
        setRating(myRating.valoracion);
        setHasRated(true);
      }
    }
  }

  async function handleRate(value: number) {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      alert('Debes iniciar sesión para valorar');
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('clases_valoraciones')
      .upsert({ 
        clase_id: claseId, 
        user_id: user.id, 
        valoracion: value 
      }, { onConflict: 'clase_id, user_id' });

    if (error) {
      console.error('Error rating:', error);
      alert('Error al guardar valoración');
    } else {
      setRating(value);
      setHasRated(true);
      loadRating(); // Refresh average
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col items-center gap-2 p-4 bg-white rounded-lg shadow-sm">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            className={`text-2xl transition-colors ${
              (hover || rating) >= star ? 'text-yellow-400' : 'text-gray-300'
            }`}
            onClick={() => handleRate(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            disabled={loading}
          >
            ★
          </button>
        ))}
      </div>
      <div className="text-sm text-gray-500">
        {average > 0 ? (
          <>
            <span className="font-bold text-gray-900">{average.toFixed(1)}</span>
            <span className="mx-1">/</span>
            5 ({count} votos)
          </>
        ) : (
          'Sé el primero en valorar'
        )}
      </div>
    </div>
  );
}

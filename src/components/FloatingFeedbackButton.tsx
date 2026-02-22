'use client';

import { useState } from 'react';
import { MessageSquare, Star } from 'lucide-react';
import CommentsCourseSummary from './CommentsCourseSummary';
import StarRating from './StarRating';

export default function FloatingFeedbackButton({ cursoId, claseId }: { cursoId: string, claseId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'comments' | 'rating'>('comments');

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Botón flotante */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg flex items-center gap-2 transition-transform hover:scale-105"
        aria-label="Feedback"
      >
        <MessageSquare size={24} />
        <span className="font-medium hidden md:inline">Feedback</span>
      </button>

      {/* Modal/Drawer flotante */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 md:w-96 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden animate-fade-in-up">
          <div className="flex border-b border-gray-200">
            <button
              className={`flex-1 py-3 px-4 text-sm font-medium ${
                activeTab === 'comments'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('comments')}
            >
              <div className="flex items-center justify-center gap-2">
                <MessageSquare size={16} />
                Comentarios
              </div>
            </button>
            <button
              className={`flex-1 py-3 px-4 text-sm font-medium ${
                activeTab === 'rating'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('rating')}
            >
              <div className="flex items-center justify-center gap-2">
                <Star size={16} />
                Valorar Clase
              </div>
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-4 bg-gray-50">
            {activeTab === 'comments' ? (
              <CommentsCourseSummary cursoId={cursoId} compact={true} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full space-y-4 py-8">
                <h3 className="text-lg font-semibold text-gray-900">¿Qué te pareció la clase?</h3>
                <StarRating claseId={claseId} />
                <p className="text-sm text-gray-500 text-center px-4">
                  Tu valoración nos ayuda a mejorar el contenido para futuros estudiantes.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

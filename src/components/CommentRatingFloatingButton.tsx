"use client";

import { useState } from "react";

interface CommentRatingFloatingButtonProps {
  claseId: string;
  onCommentSubmitted: () => void;
}

export default function CommentRatingFloatingButton({
  claseId,
  onCommentSubmitted,
}: CommentRatingFloatingButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handleSubmit = async () => {
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/clases/comentarios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clase_id: claseId,
          texto: comment,
          calificacion_estrellas: rating,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al enviar el comentario.");
      }

      setSuccess(true);
      setComment("");
      setRating(0);
      onCommentSubmitted(); // Notify parent component to refresh comments
      setTimeout(() => setIsOpen(false), 2000); // Close modal after a short delay
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        aria-label="Dejar un comentario o calificación"
      >
        <span className="text-2xl">💬⭐</span>
        <span className="ml-2 hidden md:inline">Comentar y Calificar</span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Tu opinión sobre la clase
            </h2>
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              &times;
            </button>

            {/* Star Rating */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ¿Qué te pareció la clase? Califica al profesor:
              </label>
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`text-3xl ${
                      star <= rating ? "text-yellow-400" : "text-gray-300"
                    } focus:outline-none`}
                    aria-label={`${star} estrellas`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            {/* Comment Textarea */}
            <div className="mb-4">
              <label
                htmlFor="comment"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Tu comentario:
              </label>
              <textarea
                id="comment"
                rows={4}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2"
                placeholder="¡Cuéntanos qué te pareció la clase! Tu comentario es muy valioso."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={isSubmitting || success}
              ></textarea>
            </div>

            {error && (
              <p className="text-red-600 text-sm mb-3">{error}</p>
            )}
            {success && (
              <p className="text-green-600 text-sm mb-3">
                ¡Comentario enviado con éxito!
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !comment || rating === 0}
              className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Enviando..." : "Enviar Comentario"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { QrCode, CreditCard, AlertCircle } from "lucide-react";

interface UalaBisQRComponentProps {
  amount?: number;
  description?: string;
  qrData?: string;
}

export function UalaBisQRComponent({
  amount = 0,
  description = "Pago de mensualidad",
  qrData,
}: UalaBisQRComponentProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Pago con Ualá Bis</h3>
            <p className="text-sm text-white/80">Código QR para pago rápido</p>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="p-6">
        {/* Información del pago */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Concepto:</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {description}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Monto:</span>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              ${amount.toLocaleString('es-AR')}
            </span>
          </div>
        </div>

        {/* Área del QR Code */}
        <div className="relative">
          {qrData ? (
            // Aquí se renderizará el QR real cuando esté disponible
            <div className="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <div className="w-64 h-64 bg-white rounded-lg shadow-lg flex items-center justify-center">
                {/* Placeholder para el QR real */}
                <div className="text-center">
                  <QrCode className="w-48 h-48 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">QR Code</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 text-center">
                Escanea este código con la app Ualá Bis
              </p>
            </div>
          ) : (
            // Placeholder cuando no hay datos
            <div className="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-900/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
              <QrCode className="w-24 h-24 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                QR Code de pago
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-xs">
                El código QR se generará cuando selecciones un monto a pagar
              </p>
            </div>
          )}
        </div>

        {/* Instrucciones */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                ¿Cómo pagar con Ualá Bis?
              </h4>
              <ol className="text-xs text-blue-800 dark:text-blue-400 space-y-1 list-decimal list-inside">
                <li>Abre la aplicación Ualá Bis en tu celular</li>
                <li>Selecciona la opción &quot;Pagar con QR&quot;</li>
                <li>Escanea el código QR mostrado arriba</li>
                <li>Confirma el monto y completa el pago</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium">
            Cancelar
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
            Generar QR
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Moon, Sun, User, Menu, LogOut, Settings, LogIn, UserPlus } from "lucide-react";
import { useAuth } from "./AuthProvider";
import Link from "next/link";

interface NavbarProps {
  onToggleSidebar?: () => void;
}

function readLocalStorage(key: string) {
  try {
    return typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

export function Navbar({ onToggleSidebar }: NavbarProps) {
  const [darkMode, setDarkMode] = useState(false);
  const { user, signOut, loading } = useAuth();
  const [studentOk, setStudentOk] = useState(false);

  useEffect(() => {
    // Verificar si hay sesión de alumno "aprobado" en localStorage
    const checkStudent = () => {
      if (typeof window !== "undefined") {
        const ok = window.localStorage.getItem("student_ok") === "1";
        setStudentOk(ok);
      }
    };
    checkStudent();
    // Escuchar cambios en localStorage si es posible, o simplemente chequear al montar
    window.addEventListener("storage", checkStudent);
    return () => window.removeEventListener("storage", checkStudent);
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo y nombre del instituto */}
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-lg">EFT</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                Elevar Formación Técnica
              </h1>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Plataforma para alumnos
              </p>
            </div>
          </div>
        </div>

        {/* Controles de usuario */}
        <div className="flex items-center gap-2">
          {/* Toggle modo oscuro */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle dark mode"
          >
            {darkMode ? (
              <Sun className="w-5 h-5 text-yellow-500" />
            ) : (
              <Moon className="w-5 h-5 text-gray-700" />
            )}
          </button>

          {/* Estado de autenticación */}
          {loading ? (
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/ajustes"
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {user.user_metadata?.nombre || "Usuario"}
                </span>
              </Link>
              <button
                onClick={handleSignOut}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-red-600 dark:text-red-400"
                title="Cerrar sesión"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : studentOk ? null : (
            <div className="flex items-center gap-2">
              <Link
                href="/auth"
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden md:block text-sm font-medium">Iniciar Sesión</span>
              </Link>
              <Link
                href="/auth?mode=register"
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden md:block text-sm font-medium">Registrarse</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

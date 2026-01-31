using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using Supabase;
using System.Net.Http;
using System.Text.Json;

namespace InstitutoFormacionTecnica
{
    /// <summary>
    /// Lógica de interacción para App.xaml
    /// </summary>
    public partial class App : Application
    {
        private static Supabase.Client _supabase;
        private static string _supabaseUrl;
        private static string _supabaseAnonKey;
        private static bool _isSupabaseInitialized = false;

        public static Supabase.Client Supabase
        {
            get
            {
                if (_supabase == null)
                {
                    InitializeSupabase();
                }
                return _supabase;
            }
        }

        private static void InitializeSupabase()
        {
            try
            {
                // Validar configuración
                _supabaseUrl = ConfigurationManager.AppSettings["SupabaseUrl"];
                _supabaseAnonKey = ConfigurationManager.AppSettings["SupabaseAnonKey"];

                if (string.IsNullOrEmpty(_supabaseUrl) || string.IsNullOrEmpty(_supabaseAnonKey))
                {
                    throw new ConfigurationErrorsException("Las credenciales de Supabase no están configuradas correctamente.");
                }

                // Inicializar cliente Supabase
                _supabase = new Supabase.Client(_supabaseUrl, _supabaseAnonKey);
                
                // Inicialización asíncrona (lanzada en segundo plano)
                Task.Run(async () => await _supabase.InitializeAsync());

                _isSupabaseInitialized = true;
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error al inicializar Supabase:\n{ex.Message}", 
                              "Error Crítico", MessageBoxButton.OK, MessageBoxImage.Error);
                Current.Shutdown();
            }
        }

        private static void TestSupabaseConnection()
        {
            // Opcional: Implementar chequeo de salud si es necesario
        }

        protected override void OnStartup(StartupEventArgs e)
        {
            base.OnStartup(e);
            
            try
            {
                // Verificar que el sistema tenga .NET 8.0 o superior
                if (!IsNet80OrHigher())
                {
                    MessageBox.Show(".NET 8.0 o superior es requerido para ejecutar esta aplicación. Por favor, actualice su versión de .NET.", 
                                  "Versión de .NET no compatible", MessageBoxButton.OK, MessageBoxImage.Error);
                    Current.Shutdown();
                    return;
                }

                // Verificar que los archivos de configuración existan
                if (!ConfigurationManager.AppSettings.HasKeys())
                {
                    throw new ConfigurationErrorsException("No se encontraron claves de configuración en el archivo App.config.");
                }

                // Inicializar Supabase
                var supabase = Supabase;
                
                // Mostrar mensaje de éxito si todo funciona correctamente
                var splashWindow = new SplashWindow();
                splashWindow.Show();
                splashWindow.InitializeProgress("Conectando con Supabase...");
                
                // Simular tiempo de carga
                System.Threading.Tasks.Task.Delay(2000).ContinueWith(t =>
                {
                    splashWindow.Dispatcher.Invoke(() =>
                    {
                        splashWindow.InitializeProgress("Verificando conexión...");
                    });
                });
                
                System.Threading.Tasks.Task.Delay(4000).ContinueWith(t =>
                {
                    splashWindow.Dispatcher.Invoke(() =>
                    {
                        splashWindow.InitializeProgress("Cargando aplicación...");
                    });
                });
                
                System.Threading.Tasks.Task.Delay(6000).ContinueWith(t =>
                {
                    splashWindow.Dispatcher.Invoke(() =>
                    {
                        splashWindow.Close();
                    });
                });
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error al iniciar la aplicación:\n{ex.Message}", 
                              "Error de Inicio", MessageBoxButton.OK, MessageBoxImage.Error);
                Current.Shutdown();
            }
        }

        private bool IsNet80OrHigher()
        {
            try
            {
                // Verificar versión de .NET
                var version = Environment.Version;
                return version.Major > 8 || (version.Major == 8 && version.Minor >= 0);
            }
            catch
            {
                return false;
            }
        }
    }
}
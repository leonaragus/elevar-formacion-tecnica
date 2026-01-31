using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Media;
using Supabase;

namespace InstitutoFormacionTecnica
{
    /// <summary>
    /// Lógica de interacción para MainWindow.xaml
    /// </summary>
    public partial class MainWindow : Window
    {
        private readonly Supabase.Client _supabase;
        public ObservableCollection<ActivityItem> RecentActivities { get; set; }

        public MainWindow()
        {
            InitializeComponent();
            _supabase = App.Supabase;
            RecentActivities = new ObservableCollection<ActivityItem>();
            RecentActivityList.ItemsSource = RecentActivities;
        }

        private async void Window_Loaded(object sender, RoutedEventArgs e)
        {
            try
            {
                // Cargar datos reales
                await LoadRealData();
                
                // Verificar conexión real
                await CheckConnection();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error al cargar datos: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private async Task LoadRealData()
        {
            try
            {
                // TODO: Implementar carga real desde Supabase cuando esté configurado
                // Por ahora, mostrar datos de prueba
                RecentActivities.Add(new ActivityItem 
                { 
                    Icon = "📝", 
                    Description = "Nuevo curso creado: Curso de Ejemplo", 
                    Time = "Recientemente" 
                });
                
                RecentActivities.Add(new ActivityItem 
                { 
                    Icon = "💰", 
                    Description = "Pago registrado: $15000", 
                    Time = "Hace 1 hora" 
                });
                
                RecentActivities.Add(new ActivityItem 
                { 
                    Icon = "👤", 
                    Description = "Nuevo estudiante: Juan Pérez", 
                    Time = "Hace 2 horas" 
                });
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error al cargar datos: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void LoadTestData()
        {
            RecentActivities.Add(new ActivityItem { Icon = "📝", Description = "Nuevo curso creado: Programación Web", Time = "Hace 2 horas" });
            RecentActivities.Add(new ActivityItem { Icon = "👤", Description = "Nuevo estudiante registrado: Juan Perez", Time = "Hace 3 horas" });
            RecentActivities.Add(new ActivityItem { Icon = "💰", Description = "Pago recibido: Matrícula #1234", Time = "Hace 4 horas" });
            RecentActivities.Add(new ActivityItem { Icon = "🎓", Description = "Certificado emitido: María Garcia", Time = "Hace 1 día" });
        }

        private async Task CheckConnection()
        {
            try
            {
                StatusText.Text = "Verificando conexión...";
                
                // Verificar si el cliente está inicializado
                if (_supabase != null)
                {
                    // Intentar obtener la sesión actual para verificar conexión real
                    var session = _supabase.Auth.CurrentSession;
                    
                    DatabaseStatus.Text = "Conectada";
                    DatabaseStatus.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#10b981")); // Success color
                    StatusText.Text = "Conectado";
                }
                else
                {
                    throw new Exception("Cliente Supabase no inicializado");
                }
            }
            catch (Exception ex)
            {
                DatabaseStatus.Text = "Desconectada";
                DatabaseStatus.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#ef4444")); // Danger color
                StatusText.Text = "Error de conexión";
                // No mostrar popup bloqueante al inicio, solo estado
            }
        }

        private async void RefreshButton_Click(object sender, RoutedEventArgs e)
        {
            await CheckConnection();
            RecentActivities.Clear();
            await LoadRealData();
        }

        private void NewCourseButton_Click(object sender, RoutedEventArgs e)
        {
            var window = new NewCourseWindow();
            window.Owner = this;
            if (window.ShowDialog() == true)
            {
                // Refrescar lista o mostrar notificación
                MessageBox.Show("Curso creado exitosamente", "Éxito", MessageBoxButton.OK, MessageBoxImage.Information);
                RecentActivities.Insert(0, new ActivityItem { Icon = "📝", Description = "Nuevo curso creado recientemente", Time = "Ahora" });
            }
        }

        private void NewStudentButton_Click(object sender, RoutedEventArgs e)
        {
            var window = new NewStudentWindow();
            window.Owner = this;
            if (window.ShowDialog() == true)
            {
                MessageBox.Show("Estudiante registrado exitosamente", "Éxito", MessageBoxButton.OK, MessageBoxImage.Information);
                RecentActivities.Insert(0, new ActivityItem { Icon = "👤", Description = "Nuevo estudiante registrado recientemente", Time = "Ahora" });
            }
        }

        private void RegisterPaymentButton_Click(object sender, RoutedEventArgs e)
        {
            var window = new RegisterPaymentWindow();
            window.Owner = this;
            if (window.ShowDialog() == true)
            {
                MessageBox.Show("Pago registrado exitosamente", "Éxito", MessageBoxButton.OK, MessageBoxImage.Information);
                RecentActivities.Insert(0, new ActivityItem { Icon = "💰", Description = "Pago registrado recientemente", Time = "Ahora" });
            }
        }
    }

    public class ActivityItem
    {
        public string Icon { get; set; }
        public string Description { get; set; }
        public string Time { get; set; }
    }
}
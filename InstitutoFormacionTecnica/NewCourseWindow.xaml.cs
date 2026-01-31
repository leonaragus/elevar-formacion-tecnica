using System;
using System.Windows;
using Supabase;

namespace InstitutoFormacionTecnica
{
    public partial class NewCourseWindow : Window
    {
        private readonly Supabase.Client _supabase;

        public NewCourseWindow()
        {
            InitializeComponent();
            _supabase = App.Supabase;
            StartDatePicker.SelectedDate = DateTime.Today;
            EndDatePicker.SelectedDate = DateTime.Today.AddMonths(3);
        }

        private async void SaveButton_Click(object sender, RoutedEventArgs e)
        {
            // Validar campos
            if (string.IsNullOrWhiteSpace(CourseNameTextBox.Text))
            {
                MessageBox.Show("Por favor ingrese el nombre del curso.", "Validación", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            if (string.IsNullOrWhiteSpace(PriceTextBox.Text))
            {
                MessageBox.Show("Por favor ingrese el precio del curso.", "Validación", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            try
            {
                // TODO: Implementar con Supabase cuando esté configurado
                MessageBox.Show("Curso creado exitosamente (simulado)", "Éxito", MessageBoxButton.OK, MessageBoxImage.Information);
                DialogResult = true;
                Close();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error al guardar en Supabase: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void CancelButton_Click(object sender, RoutedEventArgs e)
        {
            DialogResult = false;
            Close();
        }
    }
}
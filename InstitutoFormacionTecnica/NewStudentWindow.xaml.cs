using System;
using System.Windows;
using Supabase;

namespace InstitutoFormacionTecnica
{
    public partial class NewStudentWindow : Window
    {
        private readonly Supabase.Client _supabase;

        public NewStudentWindow()
        {
            InitializeComponent();
            _supabase = App.Supabase;
            BirthDatePicker.SelectedDate = DateTime.Today.AddYears(-18);
        }

        private async void SaveStudentButton_Click(object sender, RoutedEventArgs e)
        {
            // Validar campos
            if (string.IsNullOrWhiteSpace(FirstNameTextBox.Text) || string.IsNullOrWhiteSpace(LastNameTextBox.Text))
            {
                MessageBox.Show("Por favor ingrese nombre y apellido.", "Validación", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            if (string.IsNullOrWhiteSpace(DniTextBox.Text))
            {
                MessageBox.Show("Por favor ingrese el DNI.", "Validación", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            try
            {
                // TODO: Implementar con Supabase cuando esté configurado
                MessageBox.Show("Estudiante registrado exitosamente (simulado)", "Éxito", MessageBoxButton.OK, MessageBoxImage.Information);
                DialogResult = true;
                Close();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error al guardar en Supabase: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void CancelStudentButton_Click(object sender, RoutedEventArgs e)
        {
            DialogResult = false;
            Close();
        }
    }
}
using System;
using System.Windows;
using Supabase;

namespace InstitutoFormacionTecnica
{
    public partial class RegisterPaymentWindow : Window
    {
        private readonly Supabase.Client _supabase;

        public RegisterPaymentWindow()
        {
            InitializeComponent();
            _supabase = App.Supabase;
            PaymentDatePicker.SelectedDate = DateTime.Today;
            
            // Cargar datos de prueba en combos
            LoadMockData();
        }

        private void LoadMockData()
        {
            StudentComboBox.Items.Add("Juan Perez - 12345678");
            StudentComboBox.Items.Add("Maria Garcia - 87654321");
            StudentComboBox.SelectedIndex = 0;

            CourseComboBox.Items.Add("Programación Web Full Stack");
            CourseComboBox.Items.Add("Diseño UX/UI");
            CourseComboBox.SelectedIndex = 0;
            
            InvoiceTypeComboBox.SelectedIndex = 2; // C
        }

        private async void RegisterPaymentButton_Click(object sender, RoutedEventArgs e)
        {
            // Validar campos
            if (string.IsNullOrWhiteSpace(AmountTextBox.Text))
            {
                MessageBox.Show("Por favor ingrese el monto.", "Validación", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            try
            {
                // Extraer user_id del texto del combo (simplificado)
                var selectedStudent = StudentComboBox.SelectedItem?.ToString() ?? "";
                var userId = Guid.NewGuid(); // En un caso real, obtendríamos el ID real del estudiante
                
                var selectedCourse = CourseComboBox.SelectedItem?.ToString() ?? "";
                var courseId = "curso-1"; // En un caso real, obtendríamos el ID real del curso

                // TODO: Implementar con Supabase cuando esté configurado
                MessageBox.Show("Pago registrado exitosamente (simulado)", "Éxito", MessageBoxButton.OK, MessageBoxImage.Information);
                DialogResult = true;
                Close();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error al guardar en Supabase: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void CancelPaymentButton_Click(object sender, RoutedEventArgs e)
        {
            DialogResult = false;
            Close();
        }
    }
}
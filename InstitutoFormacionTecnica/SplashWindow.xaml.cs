using System;
using System.Windows;
using System.Windows.Threading;

namespace InstitutoFormacionTecnica
{
    public partial class SplashWindow : Window
    {
        public SplashWindow()
        {
            InitializeComponent();
        }

        public void InitializeProgress(string status)
        {
            Dispatcher.Invoke(() =>
            {
                StatusText.Text = status;
                ProgressBar.IsIndeterminate = true;
            });
        }
    }
}
param(
  [Parameter(Mandatory=$true)][string]$SourceHwnd,
  [Parameter(Mandatory=$true)][int]$X,
  [Parameter(Mandatory=$true)][int]$Y,
  [Parameter(Mandatory=$true)][int]$W,
  [Parameter(Mandatory=$true)][int]$H,
  [string]$Title = "Destaque"
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$code = @"
using System;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Windows.Forms;

public class DwmReplicaForm : Form
{
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT
    {
        public int left;
        public int top;
        public int right;
        public int bottom;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct PSIZE
    {
        public int x;
        public int y;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct DWM_THUMBNAIL_PROPERTIES
    {
        public int dwFlags;
        public RECT rcDestination;
        public RECT rcSource;
        public byte opacity;
        [MarshalAs(UnmanagedType.Bool)] public bool fVisible;
        [MarshalAs(UnmanagedType.Bool)] public bool fSourceClientAreaOnly;
    }

    [DllImport("dwmapi.dll")]
    static extern int DwmRegisterThumbnail(IntPtr hwndDestination, IntPtr hwndSource, out IntPtr phThumbnailId);

    [DllImport("dwmapi.dll")]
    static extern int DwmUnregisterThumbnail(IntPtr hThumbnailId);

    [DllImport("dwmapi.dll")]
    static extern int DwmUpdateThumbnailProperties(IntPtr hThumbnailId, ref DWM_THUMBNAIL_PROPERTIES ptnProperties);

    const int DWM_TNP_RECTDESTINATION = 0x00000001;
    const int DWM_TNP_RECTSOURCE = 0x00000002;
    const int DWM_TNP_OPACITY = 0x00000004;
    const int DWM_TNP_VISIBLE = 0x00000008;
    const int DWM_TNP_SOURCECLIENTAREAONLY = 0x00000010;

    readonly IntPtr source;
    readonly RECT sourceRect;
    readonly Size originalSize;
    IntPtr thumbnail = IntPtr.Zero;
    bool dragging = false;
    Point dragStart;

    public DwmReplicaForm(IntPtr sourceHwnd, int x, int y, int w, int h, string title)
    {
        source = sourceHwnd;
        sourceRect = new RECT { left = x, top = y, right = x + w, bottom = y + h };
        originalSize = new Size(Math.Max(180, w), Math.Max(100, h));

        Text = title;
        Size = originalSize;
        MinimumSize = new Size(120, 70);
        FormBorderStyle = FormBorderStyle.None;
        BackColor = Color.Black;
        StartPosition = FormStartPosition.CenterScreen;
        TopMost = true;
        ShowInTaskbar = true;
        DoubleBuffered = true;

        MouseDown += OnMouseDown;
        MouseMove += OnMouseMove;
        MouseUp += (s, e) => dragging = false;
        MouseWheel += OnMouseWheel;
        Resize += (s, e) => UpdateThumb();
        FormClosed += (s, e) => { if (thumbnail != IntPtr.Zero) DwmUnregisterThumbnail(thumbnail); };

        BuildMenu();
    }

    protected override void OnShown(EventArgs e)
    {
        base.OnShown(e);
        DwmRegisterThumbnail(Handle, source, out thumbnail);
        UpdateThumb();
    }

    void UpdateThumb()
    {
        if (thumbnail == IntPtr.Zero || ClientSize.Width <= 0 || ClientSize.Height <= 0) return;

        var props = new DWM_THUMBNAIL_PROPERTIES();
        props.dwFlags = DWM_TNP_RECTDESTINATION | DWM_TNP_RECTSOURCE | DWM_TNP_OPACITY | DWM_TNP_VISIBLE | DWM_TNP_SOURCECLIENTAREAONLY;
        props.rcDestination = new RECT { left = 0, top = 0, right = ClientSize.Width, bottom = ClientSize.Height };
        props.rcSource = sourceRect;
        props.opacity = (byte)Math.Round(Opacity * 255);
        props.fVisible = true;
        props.fSourceClientAreaOnly = true;
        DwmUpdateThumbnailProperties(thumbnail, ref props);
    }

    void BuildMenu()
    {
        var menu = new ContextMenuStrip();
        var topMost = new ToolStripMenuItem("Desligar sempre por cima");
        topMost.Click += (s, e) => {
            TopMost = !TopMost;
            topMost.Text = TopMost ? "Desligar sempre por cima" : "Ligar sempre por cima";
        };
        menu.Items.Add(topMost);

        var opacity = new ToolStripMenuItem("Opacidade");
        foreach (int value in new int[] { 100, 90, 80, 70, 60, 50, 40, 30, 20 })
        {
            var item = new ToolStripMenuItem(value + "%");
            item.Click += (s, e) => { Opacity = value / 100.0; UpdateThumb(); };
            opacity.DropDownItems.Add(item);
        }
        menu.Items.Add(opacity);
        menu.Items.Add(new ToolStripSeparator());

        var original = new ToolStripMenuItem("Tamanho original");
        original.Click += (s, e) => Size = originalSize;
        menu.Items.Add(original);

        var bigger = new ToolStripMenuItem("Aumentar");
        bigger.Click += (s, e) => ScaleWindow(1.12);
        menu.Items.Add(bigger);

        var smaller = new ToolStripMenuItem("Diminuir");
        smaller.Click += (s, e) => ScaleWindow(0.88);
        menu.Items.Add(smaller);

        menu.Items.Add(new ToolStripSeparator());
        var close = new ToolStripMenuItem("Fechar");
        close.Click += (s, e) => Close();
        menu.Items.Add(close);
        ContextMenuStrip = menu;
    }

    void OnMouseDown(object sender, MouseEventArgs e)
    {
        if (e.Button == MouseButtons.Left)
        {
            dragging = true;
            dragStart = e.Location;
        }
    }

    void OnMouseMove(object sender, MouseEventArgs e)
    {
        if (!dragging) return;
        Left += e.X - dragStart.X;
        Top += e.Y - dragStart.Y;
    }

    void OnMouseWheel(object sender, MouseEventArgs e)
    {
        ScaleWindow(e.Delta > 0 ? 1.08 : 0.92);
    }

    void ScaleWindow(double factor)
    {
        int nextW = Math.Max(120, Math.Min(1800, (int)Math.Round(Width * factor)));
        int nextH = Math.Max(70, Math.Min(1200, (int)Math.Round(Height * factor)));
        Size = new Size(nextW, nextH);
    }
}
"@

Add-Type -TypeDefinition $code -ReferencedAssemblies System.Windows.Forms,System.Drawing

[System.Windows.Forms.Application]::EnableVisualStyles()
$hwnd = [IntPtr]([Int64]$SourceHwnd)
$form = New-Object DwmReplicaForm -ArgumentList @($hwnd, $X, $Y, $W, $H, $Title)
[System.Windows.Forms.Application]::Run($form)

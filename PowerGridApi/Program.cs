var builder = WebApplication.CreateBuilder(args);

// Configuration de CORS: ce sont les politiques de CORS qui permettent de gérer les requêtes cross-origin.
builder.Services.AddCors(opt =>
    opt.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

// Application de la politique CORS.
var app = builder.Build();
app.UseCors();

// Liste d'éléments du réseau électrique.
var elements = new List<GridElement>
{
    new(1, "T-Nord",       "Transformateur", 120.0, "En service"),
    new(2, "G-Centrale",   "Générateur",      13.8, "En service"),
    new(3, "CH-Secteur4",  "Charge",           4.16, "En service"),
    new(4, "DJ-Ligne12",   "Disjoncteur",     25.0, "Hors service"),
};

// Route racine: redirige vers l'API pour éviter une page vide.
app.MapGet("/", () => Results.Redirect("/api/elements"));

// Endpoint pour récupérer la liste des éléments.
app.MapGet("/api/elements", () => elements);

// Endpoint pour récupérer un élément par son ID.
app.MapGet("/api/elements/{id}", (int id) =>
    elements.FirstOrDefault(e => e.Id == id) is { } el
        ? Results.Ok(el)
        : Results.NotFound());

// Endpoint pour créer un nouvel élément.
app.MapPost("/api/elements", (GridElement el) =>
{
    el = el with { Id = elements.Max(e => e.Id) + 1 };
    elements.Add(el);
    return Results.Created($"/api/elements/{el.Id}", el);
});

// Lancement de l'application.
app.Run();

// Modèle de données pour les éléments du réseau électrique.
record GridElement(int Id, string Name, string Type, double TensionKv, string Status);

public partial class Program { }
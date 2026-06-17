var builder = WebApplication.CreateBuilder(args);

// Configuration de CORS: ce sont les politiques de CORS qui permettent de gérer les requêtes cross-origin.
builder.Services.AddCors(opt =>
    opt.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

// Application de la politique CORS.
var app = builder.Build();
app.UseCors();

// Éléments du réseau électrique (avec coordonnées pour la carte).
var elements = new List<GridElement>
{
    new(1, "T-Nord",      "Transformateur", 120.0, "En service",  240, 140),
    new(2, "G-Centrale",  "Générateur",      13.8, "En service",   60, 250),
    new(3, "CH-Secteur4", "Charge",           4.16, "En service",  440, 250),
    new(4, "DJ-Ligne12",  "Disjoncteur",     25.0, "Hors service", 440, 140),
    new(5, "T-Sud",       "Transformateur",  63.0, "En service",  240, 360),
    new(6, "DJ-Ligne34",  "Disjoncteur",     25.0, "En service",  440, 360),
};

// Liaisons orientées (source -> cible) entre éléments.
var connections = new List<Connection>
{
    new(1, 2, 1),
    new(2, 2, 5),
    new(3, 2, 3),
    new(4, 1, 4),
    new(5, 5, 6),
};

// Zones de la ville alimentées par un élément du réseau.
var zones = new List<Zone>
{
    new(1, "Résidentiel-A", "Résidentiel", 720,  80, 4),
    new(2, "Hôpital",       "Critique",    720, 180, 4),
    new(3, "Centre-Ville",  "Commercial",  720, 250, 3),
    new(4, "Industriel",    "Industriel",  720, 320, 6),
    new(5, "Commercial-Est","Commercial",  720, 420, 6),
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

// Endpoint pour mettre à jour le statut d'un élément (En service / Hors service).
app.MapPut("/api/elements/{id}/status", (int id, StatusUpdate update) =>
{
    var index = elements.FindIndex(e => e.Id == id);
    if (index < 0)
        return Results.NotFound();

    elements[index] = elements[index] with { Status = update.Status };
    return Results.Ok(elements[index]);
});

// Endpoint pour récupérer toute la topologie du réseau (éléments, liaisons, zones).
app.MapGet("/api/topology", () => new { elements, connections, zones });

// Lancement de l'application.
app.Run();

// Modèle de données pour les éléments du réseau électrique.
record GridElement(int Id, string Name, string Type, double TensionKv, string Status, int X = 0, int Y = 0);

// Liaison orientée entre deux éléments (la puissance circule de FromId vers ToId).
record Connection(int Id, int FromId, int ToId);

// Zone de la ville alimentée par un élément du réseau.
record Zone(int Id, string Name, string Category, int X, int Y, int SourceElementId);

// Corps de requête pour la mise à jour du statut.
record StatusUpdate(string Status);

public partial class Program { }

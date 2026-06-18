var builder = WebApplication.CreateBuilder(args);

// Configuration de CORS: ce sont les politiques de CORS qui permettent de gérer les requêtes cross-origin.
builder.Services.AddCors(opt =>
    opt.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

// Application de la politique CORS.
var app = builder.Build();
app.UseCors();

// Éléments du réseau électrique (avec coordonnées pour la carte).
// Topologie radiale: un poste central (G-Centrale) alimente plusieurs départs
// (Nord / Sud / Est / Ouest), chacun se ramifiant vers des disjoncteurs de zone.
var elements = new List<GridElement>
{
    // Coeur du réseau
    new(2, "G-Centrale",  "Générateur",      13.8, "En service",  560, 380),

    // Départ Nord
    new(1, "T-Nord",      "Transformateur", 120.0, "En service",  560, 250),
    new(4, "DJ-Ligne12",  "Disjoncteur",     25.0, "En service",  470, 150),
    new(13, "DJ-Nord2",   "Disjoncteur",     25.0, "En service",  680, 160),

    // Départ Est
    new(7, "T-Est",       "Transformateur",  63.0, "En service",  740, 330),
    new(8, "DJ-Est1",     "Disjoncteur",     25.0, "En service",  880, 250),
    new(9, "DJ-Est2",     "Disjoncteur",     25.0, "En service",  900, 410),

    // Départ Sud
    new(5, "T-Sud",       "Transformateur",  63.0, "En service",  470, 500),
    new(6, "DJ-Ligne34",  "Disjoncteur",     25.0, "En service",  360, 600),
    new(14, "T-SudEst",   "Transformateur",  63.0, "En service",  640, 560),
    new(15, "DJ-SE1",     "Disjoncteur",     25.0, "En service",  760, 640),
    new(3, "CH-Secteur4", "Charge",           4.16, "En service",  700, 470),

    // Départ Ouest
    new(10, "T-Ouest",    "Transformateur",  63.0, "En service",  380, 330),
    new(11, "DJ-Ouest1",  "Disjoncteur",     25.0, "En service",  220, 250),
    new(12, "DJ-Ouest2",  "Disjoncteur",     25.0, "En service",  200, 410),

    // Générateur de secours (hors service au démarrage: à activer pour la démo)
    new(16, "G-Secours",  "Générateur",      13.8, "Hors service", 140, 600),
    new(17, "DJ-Secours", "Disjoncteur",     25.0, "En service",   90, 690),
};

// Liaisons orientées (source -> cible) entre éléments.
var connections = new List<Connection>
{
    // Sorties du poste central
    new(1, 2, 1),   // G-Centrale -> T-Nord
    new(2, 2, 7),   // G-Centrale -> T-Est
    new(3, 2, 5),   // G-Centrale -> T-Sud
    new(4, 2, 10),  // G-Centrale -> T-Ouest
    new(5, 2, 3),   // G-Centrale -> CH-Secteur4

    // Départ Nord
    new(6, 1, 4),   // T-Nord -> DJ-Ligne12
    new(7, 1, 13),  // T-Nord -> DJ-Nord2

    // Départ Est
    new(8, 7, 8),   // T-Est -> DJ-Est1
    new(9, 7, 9),   // T-Est -> DJ-Est2

    // Départ Sud
    new(10, 5, 6),   // T-Sud -> DJ-Ligne34
    new(11, 5, 14),  // T-Sud -> T-SudEst
    new(12, 14, 15), // T-SudEst -> DJ-SE1

    // Départ Ouest
    new(13, 10, 11), // T-Ouest -> DJ-Ouest1
    new(14, 10, 12), // T-Ouest -> DJ-Ouest2

    // Réseau de secours (isolé tant que G-Secours est hors service)
    new(15, 16, 17), // G-Secours -> DJ-Secours
};

// Zones de la ville alimentées par un élément du réseau.
// LoadMw = charge appelée (MW), Customers = nombre de clients desservis.
var zones = new List<Zone>
{
    new(1,  "Résidentiel-A",  "Résidentiel", 380,  55, 4,  4.5, 1200),
    new(2,  "Écoles",         "Public",      520,  50, 4,  1.5,    6),
    new(3,  "Hôpital",        "Critique",    700,  55, 13, 3.0,    3),
    new(4,  "Centre-Ville",   "Commercial",  780, 540, 3,  6.0,  900),
    new(5,  "Industriel",     "Industriel",  270, 690, 6,  8.0,   40),
    new(6,  "Entrepôts",      "Industriel",  430, 700, 6,  5.0,   25),
    new(7,  "Commercial-Est", "Commercial",  820, 710, 15, 4.0,  300),
    new(8,  "Quartier-Est",   "Résidentiel", 1000, 220, 8,  5.0, 1500),
    new(9,  "Parc-Techno",    "Industriel",  1010, 420, 9,  6.5,   60),
    new(10, "Résidentiel-O",  "Résidentiel",  50, 220, 11, 3.5,  950),
    new(11, "Université",     "Public",        40, 410, 12, 4.0,   30),
    new(12, "Zone-Insulaire", "Résidentiel",   50, 700, 17, 1.2,  250),
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

// Endpoint pour créer une liaison entre deux éléments (la puissance circule de FromId vers ToId).
app.MapPost("/api/connections", (ConnectionInput input) =>
{
    if (!elements.Any(e => e.Id == input.FromId) || !elements.Any(e => e.Id == input.ToId))
        return Results.BadRequest("FromId et ToId doivent référencer des éléments existants.");

    var connection = new Connection(
        connections.Count == 0 ? 1 : connections.Max(c => c.Id) + 1,
        input.FromId,
        input.ToId);
    connections.Add(connection);
    return Results.Created($"/api/connections/{connection.Id}", connection);
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
record Zone(int Id, string Name, string Category, int X, int Y, int SourceElementId, double LoadMw = 0, int Customers = 0);

// Corps de requête pour la mise à jour du statut.
record StatusUpdate(string Status);

// Corps de requête pour la création d'une liaison.
record ConnectionInput(int FromId, int ToId);

public partial class Program { }

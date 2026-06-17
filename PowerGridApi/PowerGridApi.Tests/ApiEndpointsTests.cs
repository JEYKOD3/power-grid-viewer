using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace PowerGridApi.Tests;

public class ApiEndpointsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public ApiEndpointsTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetElements_ReturnsSeedData()
    {
        var elements = await _client.GetFromJsonAsync<List<GridElementDto>>("/api/elements");

        Assert.NotNull(elements);
        Assert.True(elements.Count >= 4);
        Assert.Contains(elements, e => e.Name == "T-Nord");
    }

    [Fact]
    public async Task GetElementById_ReturnsElement_WhenExists()
    {
        var element = await _client.GetFromJsonAsync<GridElementDto>("/api/elements/2");

        Assert.NotNull(element);
        Assert.Equal(2, element.Id);
        Assert.Equal("G-Centrale", element.Name);
    }

    [Fact]
    public async Task GetElementById_ReturnsNotFound_WhenMissing()
    {
        var response = await _client.GetAsync("/api/elements/99999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task PostElement_CreatesWithNewId()
    {
        var payload = new
        {
            id = 0,
            name = "Test-CI",
            type = "Charge",
            tensionKv = 10.0,
            status = "En service",
        };

        var response = await _client.PostAsJsonAsync("/api/elements", payload);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var created = await response.Content.ReadFromJsonAsync<GridElementDto>();

        Assert.NotNull(created);
        Assert.True(created.Id >= 5);
        Assert.Equal("Test-CI", created.Name);
        Assert.Equal("Charge", created.Type);
    }

    [Fact]
    public async Task GetTopology_ReturnsElementsConnectionsAndZones()
    {
        var topology = await _client.GetFromJsonAsync<TopologyDto>("/api/topology");

        Assert.NotNull(topology);
        Assert.NotEmpty(topology.Elements);
        Assert.NotEmpty(topology.Connections);
        Assert.NotEmpty(topology.Zones);
        Assert.All(topology.Connections, c =>
        {
            Assert.Contains(topology.Elements, e => e.Id == c.FromId);
            Assert.Contains(topology.Elements, e => e.Id == c.ToId);
        });
    }

    [Fact]
    public async Task UpdateStatus_ChangesElementStatus()
    {
        var response = await _client.PutAsJsonAsync("/api/elements/2/status", new { status = "Hors service" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var updated = await response.Content.ReadFromJsonAsync<GridElementDto>();
        Assert.NotNull(updated);
        Assert.Equal(2, updated.Id);
        Assert.Equal("Hors service", updated.Status);

        // Remettre l'élément en service pour ne pas affecter les autres tests.
        await _client.PutAsJsonAsync("/api/elements/2/status", new { status = "En service" });
    }

    [Fact]
    public async Task UpdateStatus_ReturnsNotFound_WhenMissing()
    {
        var response = await _client.PutAsJsonAsync("/api/elements/99999/status", new { status = "En service" });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task PostConnection_CreatesLink_BetweenExistingElements()
    {
        var response = await _client.PostAsJsonAsync("/api/connections", new { fromId = 2, toId = 1 });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var created = await response.Content.ReadFromJsonAsync<ConnectionDto>();
        Assert.NotNull(created);
        Assert.True(created.Id > 0);
        Assert.Equal(2, created.FromId);
        Assert.Equal(1, created.ToId);
    }

    [Fact]
    public async Task PostConnection_ReturnsBadRequest_WhenElementMissing()
    {
        var response = await _client.PostAsJsonAsync("/api/connections", new { fromId = 2, toId = 99999 });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}

file record GridElementDto(int Id, string Name, string Type, double TensionKv, string Status);

file record ConnectionDto(int Id, int FromId, int ToId);

file record ZoneDto(int Id, string Name, string Category, int X, int Y, int SourceElementId);

file record TopologyDto(
    List<GridElementDto> Elements,
    List<ConnectionDto> Connections,
    List<ZoneDto> Zones);

public class CustomWebApplicationFactory : WebApplicationFactory<Program>;

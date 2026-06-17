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
}

file record GridElementDto(int Id, string Name, string Type, double TensionKv, string Status);

public class CustomWebApplicationFactory : WebApplicationFactory<Program>;

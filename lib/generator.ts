export function generateSerializers(models: string[]): string {
  const header =
    `from rest_framework import serializers\nfrom .models import ${models.join(", ")}\n\n`;
  let body = "";
  models.forEach((model) => {
    body += `class ${model}Serializer(serializers.ModelSerializer):\n`;
    body += `    class Meta:\n`;
    body += `        model = ${model}\n`;
    body += `        fields = '__all__'\n\n`;
  });
  return header + body;
}

export function generateViews(models: string[]): string {
  const header =
    `from rest_framework import viewsets\nfrom .models import ${models.join(", ")}\n` +
    `from .serializers import ${models.map((m) => m + "Serializer").join(", ")}\n\n`;
  let body = "";
  models.forEach((model) => {
    body += `class ${model}ViewSet(viewsets.ModelViewSet):\n`;
    body += `    queryset = ${model}.objects.all()\n`;
    body += `    serializer_class = ${model}Serializer\n\n`;
  });
  return header + body;
}

export function generateUrls(models: string[]): string {
  const header =
    "from rest_framework.routers import DefaultRouter\n" +
    `from .views import ${models.map((m) => m + "ViewSet").join(", ")}\n\n`;
  let body = "router = DefaultRouter()\n";
  models.forEach((model) => {
    const endpoint = model.toLowerCase() + "s";
    body += `router.register(r'${endpoint}', ${model}ViewSet)\n`;
  });
  body += "\nurlpatterns = router.urls\n";
  return header + body;
}

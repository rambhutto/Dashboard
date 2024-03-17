import requests
from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view()
def get_dummy_data(request):
    url = "https://echarts.apache.org/examples/data/asset/data/les-miserables.json"
    response = requests.get(url).json()

    return Response(response)

"""Tests for ishtar.api decorators: json_view and auth_required."""
import json
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.http import JsonResponse
from django.test import TestCase, RequestFactory

from ishtar.api import json_view, auth_required


User = get_user_model()


def get_json_response(response):
    """Helper to parse JSON from a response object created by RequestFactory."""
    return json.loads(response.content)


class JsonViewDecoratorTests(TestCase):
    """Test the json_view decorator for method restriction and JSON parsing."""

    def setUp(self):
        self.factory = RequestFactory()

    def test_json_view_puts_parsed_json_object_on_request_json(self):
        """Verify json_view parses a valid JSON object into request.json."""
        @json_view(methods=('POST',))
        def test_view(request):
            return JsonResponse({'received': request.json})

        request = self.factory.post(
            '/test/',
            data=json.dumps({'key': 'value'}),
            content_type='application/json'
        )
        response = test_view(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(get_json_response(response), {'received': {'key': 'value'}})

    def test_json_view_returns_400_on_malformed_json_body(self):
        """Verify json_view returns 400 with error message on invalid JSON."""
        @json_view(methods=('POST',))
        def test_view(request):
            return JsonResponse({'received': request.json})

        request = self.factory.post(
            '/test/',
            data='not valid json',
            content_type='application/json'
        )
        response = test_view(request)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(get_json_response(response), {'error': 'Invalid JSON.'})

    def test_json_view_returns_400_on_json_array_not_object(self):
        """Verify json_view returns 400 when body is a JSON array, not an object."""
        @json_view(methods=('POST',))
        def test_view(request):
            return JsonResponse({'received': request.json})

        request = self.factory.post(
            '/test/',
            data=json.dumps([1, 2, 3]),
            content_type='application/json'
        )
        response = test_view(request)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(get_json_response(response), {'error': 'A JSON object is required.'})

    def test_json_view_returns_400_on_json_null(self):
        """Verify json_view returns 400 when body is JSON null."""
        @json_view(methods=('POST',))
        def test_view(request):
            return JsonResponse({'received': request.json})

        request = self.factory.post(
            '/test/',
            data=json.dumps(None),
            content_type='application/json'
        )
        response = test_view(request)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(get_json_response(response), {'error': 'A JSON object is required.'})

    def test_json_view_returns_415_on_missing_content_type(self):
        """Verify json_view returns 415 when Content-Type is not application/json."""
        @json_view(methods=('POST',))
        def test_view(request):
            return JsonResponse({'received': request.json})

        request = self.factory.post(
            '/test/',
            data=json.dumps({'key': 'value'}),
            content_type='text/plain'
        )
        response = test_view(request)

        self.assertEqual(response.status_code, 415)
        self.assertEqual(get_json_response(response), {'error': 'JSON required.'})

    def test_json_view_returns_413_on_oversized_body(self):
        """Verify json_view returns a JSON 413 -- not Django's own HTML 400 -- when
        Content-Length exceeds DATA_UPLOAD_MAX_MEMORY_SIZE. Without this guard,
        request.body raises RequestDataTooBig the moment it is touched, and
        Django's default SuspiciousOperation handling turns that into a plain
        HttpResponseBadRequest (400, text/html), which breaks a JS client expecting
        JSON on every response from a json_view-backed endpoint."""
        @json_view(methods=('POST',))
        def test_view(request):
            return JsonResponse({'received': request.json})

        oversized = json.dumps({'data': 'x' * (settings.DATA_UPLOAD_MAX_MEMORY_SIZE + 1000)})
        request = self.factory.post(
            '/test/',
            data=oversized,
            content_type='application/json',
        )
        # RequestFactory only sets CONTENT_LENGTH/CONTENT_TYPE when the body is
        # truthy -- it is here, but confirm the request actually built carries a
        # Content-Length past the cap before trusting the response, rather than
        # assuming the client did what was asked.
        self.assertGreater(int(request.META['CONTENT_LENGTH']), settings.DATA_UPLOAD_MAX_MEMORY_SIZE)

        response = test_view(request)

        self.assertEqual(response.status_code, 413)
        self.assertEqual(response.headers['Content-Type'], 'application/json')
        self.assertEqual(get_json_response(response), {'error': 'Request body too large.'})

    def test_json_view_allows_get_without_parsing_body(self):
        """Verify json_view allows GET requests and sets request.json to None."""
        @json_view(methods=('GET',))
        def test_view(request):
            return JsonResponse({'json_is': request.json})

        request = self.factory.get('/test/')
        response = test_view(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(get_json_response(response), {'json_is': None})

    def test_json_view_returns_405_on_disallowed_method(self):
        """Verify json_view returns 405 for methods not in the allowed list."""
        @json_view(methods=('POST',))
        def test_view(request):
            return JsonResponse({'ok': True})

        request = self.factory.get('/test/')
        response = test_view(request)

        self.assertEqual(response.status_code, 405)
        self.assertEqual(get_json_response(response), {'error': 'Method not allowed.'})


class AuthRequiredDecoratorTests(TestCase):
    """Test the auth_required decorator for authentication enforcement."""

    def setUp(self):
        self.factory = RequestFactory()
        self.user = User.objects.create_user('user@example.com', password='test')

    def test_auth_required_returns_401_for_anonymous_user(self):
        """Verify auth_required returns 401 with specific message for unauthenticated users."""
        @auth_required
        def test_view(request):
            return JsonResponse({'ok': True})

        request = self.factory.get('/test/')
        # RequestFactory does not authenticate by default; manually add AnonymousUser
        request.user = AnonymousUser()
        response = test_view(request)

        self.assertEqual(response.status_code, 401)
        self.assertEqual(get_json_response(response), {'error': 'Sign in to continue.'})

    def test_auth_required_allows_authenticated_request(self):
        """Verify auth_required allows authenticated requests to proceed to the view."""
        @auth_required
        def test_view(request):
            return JsonResponse({'user': request.user.email})

        request = self.factory.get('/test/')
        request.user = self.user
        response = test_view(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(get_json_response(response), {'user': 'user@example.com'})

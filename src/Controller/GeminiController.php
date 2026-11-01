<?php
// src/Controller/GeminiController.php
namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class GeminiController extends AbstractController
{
    #[Route('/api/gemini', name: 'api_gemini', methods: ['POST'])]
    public function chat(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $userMessage = $data['message'] ?? '';
        $weatherContext = $data['weatherContext'] ?? '';

        if (empty($userMessage)) {
            return $this->json(['error' => 'Message vide'], Response::HTTP_BAD_REQUEST);
        }

        $apiKey = $_ENV['GEMINI_API_KEY'] ?? getenv('GEMINI_API_KEY');

        if (!$apiKey) {
            return $this->json(['error' => 'Clé API Gemini non configurée'], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        $systemPrompt = "Tu es un expert agriculteur et agronome français. " .
                       "Tu aides les agriculteurs à prendre des décisions basées sur les données météo.\n\n" .
                       "CONTEXTE MÉTÉO:\n" . $weatherContext . "\n\n" .
                       "RÈGLES:\n" .
                       "1. Réponds UNIQUEMENT en français\n" .
                       "2. Donne des conseils pratiques et précis\n" .
                       "3. Utilise des termes agricoles simples\n" .
                       "4. Propose des recommandations concrètes\n" .
                       "5. Sois amical et encourageant";

        // ✅ Construction de la requête pour l'endpoint /interactions
        $requestBody = [
            'model' => 'models/gemini-2.5-flash',
            'input' => $userMessage,
            'tools' => [
                ['type' => 'google_search']
            ],
            'generation_config' => [
                'temperature' => 1,
                'max_output_tokens' => 65536,
                'top_p' => 0.95,
                'thinking_level' => 'high'
            ],
            'system_instruction' => [
                'parts' => [
                    ['text' => $systemPrompt]
                ]
            ]
        ];

        // ✅ ENVOI VERS L'ENDPOINT /interactions
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, "https://generativelanguage.googleapis.com/v1beta/interactions?key={$apiKey}");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($requestBody));
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            return $this->json(['error' => 'Erreur cURL: ' . $error], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        $geminiResponse = json_decode($response, true);

        // ✅ Extraire la réponse
        $reply = 'Désolé, je n\'ai pas pu générer une réponse.';

        if (isset($geminiResponse['candidates'][0]['content']['parts'][0]['text'])) {
            $reply = $geminiResponse['candidates'][0]['content']['parts'][0]['text'];
        } elseif (isset($geminiResponse['output'])) {
            $reply = $geminiResponse['output'];
        }

        return $this->json([
            'message' => $reply,
            'status' => $httpCode,
            'debug' => $geminiResponse
        ]);
    }
}
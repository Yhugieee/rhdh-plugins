/*
 * Copyright Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  AuthService,
  DiscoveryService,
  LoggerService,
} from '@backstage/backend-plugin-api';
import {
  CatalogClient,
  CatalogRequestOptions,
  // GetEntitiesByRefsRequest,
} from '@backstage/catalog-client';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { EntityEnvelope } from '@backstage/catalog-model'; // For typing the response

// TEMPLATE NOTE:
// This is a simple in-memory todo list store. It is recommended to use a
// database to store data in a real application. See the database service
// documentation for more information on how to do this:
// https://backstage.io/docs/backend-system/core-services/database
export function createServer({
  auth,
  discovery,
  logger,
}: {
  auth: AuthService;
  discovery: DiscoveryService;
  logger: LoggerService;
}): McpServer {
  logger.info('Initializing ConfigurableMcpServer');

  const server = new McpServer(
    {
      name: 'configurable-backstage-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );
  const f = z.object({
    kind: z
      .string()
      .toLowerCase()
      .pipe(
        z.enum([
          'component',
          'resource',
          'system',
          'api',
          'location',
          'user',
          'group',
        ]),
      ),
    // metadata: z.object({
    //   name: z.string(),
    //   namespace: z.string(),
    //   annotations: z.record(z.string(), z.string()),
    // }).optional(),
    // description: z.string().optional(),
    // tags: z.array(z.string()).optional(),
    // spec: z.object({
    //   type: z.string(),
    //   owner: z.string()
    // }).optional()
  });

  const catalogClient = new CatalogClient({ discoveryApi: discovery });

  server.server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'list_entities',
          description: `List all Backstage entities such as Components, Systems, Resources, APIs, Locations, Users, and Groups. Results are returned in JSON array format, where each entry in the JSON array has the following fields: 'name', 'uid', and 'type'.
            This command does not require any parameters.
            Since only the 'name', 'uid', and type fields from the Entity are returned in the JSON array, some of the other Entity fields, like 'description', are not returned.
            
            Here is an example of how to call list_entities without including any parameters:
              list_entities()

            Here is an example of the output produced by list_entities:

            [{"uid":"91be1584-8919-4a72-a355-85e1e67327ab","name":"model-service-api", "type": "API":},  : This entity output is used to call the name of the API from the backstage catalog,
            {"uid":"932721b4-136e-4156-a286-d8fe18367bd1","name":"developer-model-service", "type": "Component"}: This entity output specifies the exact component on the backstage catalog,
            {"uid":"ac3fc98a-5aba-478b-bb91-767c121dfe15", "name":"generated-c4d4657b4fbb886fe0a962cdf12b8732d33946ca", "type":"location"},: this entity output is used to call the location that is available on backstage catalog.
            {"uid":"74d0d413-75fd-4e38-aacd-a3c022c5ca3c","name":"ibm-granite-8b-code-instruct", "type":"resources"} : this entity output uses the provided uid to call the resources available on backstage catalog]

            Some more details about the entries in the JSON array produced by list_entities
            - the 'name' field is a string that is readable 
            - the 'uid'  is a string used to identify the tool identity.
            - the 'type' field describes the kind of component being called.
            `,
          inputSchema: zodToJsonSchema(f),
        },

        {
          name: 'list_entities_with_tags',
          description: `List all Backstage entities such as Components, Systems, Resources, APIs, Locations, Users, and Groups. Results are returned in JSON array format, where each entry in the JSON array has the following fields: 'name', 'uid', 'type', and 'tags'.
            This command is very similar to 'list_entities', but it also includes the Entity's 'tags' in the output.
            The field 'tags' is added to each entry of the JSON Array returned.
            
            Examples of how to call:  there is only one way to call this tool, as it does not take any parameters:
              list_entities_with_tags()


            The output of this is a json array with the following fields:
            - the 'name' field is a string that shows the human readable name
            - the 'uid' field is a string used to identify the tool 
            - the 'type' is a readable string for the tool category
            - the 'tag' is a readable string for descriptive labels of the tool.
            `,

          inputSchema: zodToJsonSchema(f),
        },

        {
          name: 'get_entity_details',
          description: `Retrieve an entity from Backstage such as a Component, System, Resource, API, Location, User, or Group by its uid. Results are returned in JSON format.
            This command will list the details of the entity associated with the 'uid' parameter passed to it.
            Often times, users will call 'list_entities' or 'list_entities_with_tags' to first see which 'uid' corresponds
            to which human readable 'name' is associated with a given entity.

            For example, a user may ask "get me the details of the entity named 'developer-model-service' and hope that you
            as a helpful assistant are able to fetch the 'uid' for the entity associated with the entity whose
            name is set to 'developer-model-service', where the user had previously asked you to list all entities.

            Here is an example of how to call 'get_entity_details', where 'aaaa-bbbb-cccc-dddd' is the 'uid' for one
            of the entries provided by 'list_entities()':
              get_entity_details('aaaa-bbbb-cccc-dddd')

            The output of this is a json array with the following fields:
            - the 'metadata[]' field contains object containing readable information.
            - the 'name' field is a string that shows the human readable name.
            - the 'links[]' field provides url related to the entity.
            - the 'apiVersion[]' field provides the api version that the entity uses.
            - the 'definition[]' field gives the definition specific to the API entities.
            - the 'relations' field shows relations the entity is connected to.

            The output from this tool should look like the example below:
        

  {
  "metadata": {
    "namespace": "default",
    "annotations": {
      "backstage.io/managed-by-location": "url:https://github.com/redhat-ai-dev/model-catalog-example/tree/main/developer-model-service/catalog-info.yaml",
      "backstage.io/managed-by-origin-location": "url:https://github.com/redhat-ai-dev/model-catalog-example/blob/main/developer-model-service/catalog-info.yaml",
      "backstage.io/view-url": "https://github.com/redhat-ai-dev/model-catalog-example/tree/main/developer-model-service/catalog-info.yaml",
      "backstage.io/edit-url": "https://github.com/redhat-ai-dev/model-catalog-example/edit/main/developer-model-service/catalog-info.yaml",
      "backstage.io/source-location": "url:https://github.com/redhat-ai-dev/model-catalog-example/tree/main/developer-model-service/"
    },
    "name": "model-service-api",
    "title": "Model Service API",
    "description": "The OpenAI-compatible REST API exposed by the vLLM-based developer model service.",
    "tags": [
      "api",
      "openai",
      "vllm"
    ],
    "links": [
      {
        "url": "https://model-service.apps.domain.com/docs",
        "title": "Model Service API Documentation",
        "type": "website",
        "icon": "WebAsset"
      }
    ],
    "uid": "00930188-62ef-462b-9fcd-caa3060212fa",
    "etag": "29e7c7556c9c2bcb06e5e70bbab683093a69904b"
  },
  "apiVersion": "backstage.io/v1alpha1",
  "kind": "API",
  "spec": {
    "type": "openapi",
    "owner": "user:exampleuser",
    "lifecycle": "production",
    "dependencyOf": [
      "component:ibm-granite-8b-code-instruct"
    ],
    "definition": "{\n  \"openapi\": \"3.1.0\",\n  \"info\": {\n    \"title\": \"FastAPI\",\n    \"version\": \"0.1.0\"\n  },\n  \"servers\": [\n    {\n      \"url\": \"https://ibm-granite-8b-code-instruct-3scale-apicast-production.apps.domain.com\",\n      \"description\": \"VLLM Model Server\"\n    }\n  ],\n  \"security\": [\n    {\n      \"bearerAuth\": []\n    }\n  ],\n  \"paths\": {\n    \"/health\": {\n      \"get\": {\n        \"summary\": \"Health\",\n        \"description\": \"Health check.\",\n        \"operationId\": \"health_health_get\",\n        \"responses\": {\n          \"200\": {\n            \"description\": \"Successful Response\",\n            \"content\": {\n              \"application/json\": {\n                \"schema\": {}\n              }\n            }\n          }\n        }\n      }\n    },\n    \"/tokenize\": {\n      \"post\": {\n        \"summary\": \"Tokenize\",\n        \"operationId\": \"tokenize_tokenize_post\",\n        \"requestBody\": {\n          \"content\": {\n            \"application/json\": {\n              \"schema\": {\n                \"anyOf\": [\n                  {\n                    \"$ref\": \"#/components/schemas/TokenizeCompletionRequest\"\n                  },\n                  {\n                    \"$ref\": \"#/components/schemas/TokenizeChatRequest\"\n                  }\n                ],\n                \"title\": \"Request\"\n              }\n            }\n          },\n          \"required\": true\n        },\n        \"responses\": {\n          \"200\": {\n            \"description\": \"Successful Response\",\n            \"content\": {\n              \"application/json\": {\n                \"schema\": {}\n              }\n            }\n          },\n          \"422\": {\n            \"description\": \"Validation Error\",\n            \"content\": {\n              \"application/json\": {\n                \"schema\": {\n                  \"$ref\": \"#/components/schemas/HTTPValidationError\"\n                }\n              }\n            }\n          }\n        }\n      }\n    },\n    \"/detokenize\": {\n      \"post\": {\n        \"summary\": \"Detokenize\",\n        \"operationId\": \"detokenize_detokenize_post\",\n        \"requestBody\": {\n          \"content\": {\n            \"application/json\": {\n              \"schema\": {\n                \"$ref\": \"#/components/schemas/DetokenizeRequest\"\n              }\n            }\n          },\n          \"required\": true\n        },\n        \"responses\": {\n          \"200\": {\n            \"description\": \"Successful Response\",\n            \"content\": {\n              \"application/json\": {\n                \"schema\": {}\n              }\n            }\n          },\n          \"422\": {\n            \"description\": \"Validation Error\",\n            \"content\": {\n              \"application/json\": {\n                \"schema\": {\n                  \"$ref\": \"#/components/schemas/HTTPValidationError\"\n                }\n              }\n            }\n          }\n        }\n      }\n    },\n    \"/v1/models\": {\n      \"get\": {\n        \"summary\": \"Show Available Models\",\n        \"operationId\": \"show_available_models_v1_models_get\",\n        \"responses\": {\n          \"200\": {\n            \"description\": \"Successful Response\",\n            \"content\": {\n              \"application/json\": {\n                \"schema\": {}\n              }\n            }\n          }\n        }\n      }\n    },\n    \"/version\": {\n      \"get\": {\n        \"summary\": \"Show Version\",\n        \"operationId\": \"show_version_version_get\",\n        \"responses\": {\n          \"200\": {\n            \"description\": \"Successful Response\",\n            \"content\": {\n              \"application/json\": {\n                \"schema\": {}\n              }\n            }\n          }\n        }\n      }\n    },\n    \"/v1/chat/completions\": {\n      \"post\": {\n        \"summary\": \"Create Chat Completion\",\n        \"operationId\": \"create_chat_completion_v1_chat_completions_post\",\n        \"requestBody\": {\n          \"content\": {\n            \"application/json\": {\n              \"schema\": {\n                \"$ref\": \"#/components/schemas/ChatCompletionRequest\"\n              }\n            }\n          },\n          \"required\": true\n        },\n        \"responses\": {\n          \"200\": {\n            \"description\": \"Successful Response\",\n            \"content\": {\n              \"application/json\": {\n                \"schema\": {}\n              }\n            }\n          },\n          \"422\": {\n            \"description\": \"Validation Error\",\n            \"content\": {\n              \"application/json\": {\n                \"schema\": {\n                  \"$ref\": \"#/components/schemas/HTTPValidationError\"\n                }\n              }\n            }\n          }\n        }\n      }\n    },\n    \"/v1/completions\": {\n      \"post\": {\n        \"summary\": \"Create Completion\",\n        \"operationId\": \"create_completion_v1_completions_post\",\n        \"requestBody\": {\n          \"content\": {\n            \"application/json\": {\n              \"schema\": {\n                \"$ref\": \"#/components/schemas/CompletionRequest\"\n              }\n            }\n          },\n          \"required\": true\n        },\n        \"responses\": {\n          \"200\": {\n            \"description\": \"Successful Response\",\n            \"content\": {\n              \"application/json\": {\n                \"schema\": {}\n              }\n            }\n          },\n          \"422\": {\n            \"description\": \"Validation Error\",\n            \"content\": {\n              \"application/json\": {\n                \"schema\": {\n                  \"$ref\": \"#/components/schemas/HTTPValidationError\"\n                }\n              }\n            }\n          }\n        }\n      }\n    },\n    \"/v1/embeddings\": {\n      \"post\": {\n        \"summary\": \"Create Embedding\",\n        \"operationId\": \"create_embedding_v1_embeddings_post\",\n        \"requestBody\": {\n          \"content\": {\n            \"application/json\": {\n              \"schema\": {\n                \"$ref\": \"#/components/schemas/EmbeddingRequest\"\n              }\n            }\n          },\n          \"required\": true\n        },\n        \"responses\": {\n          \"200\": {\n            \"description\": \"Successful Response\",\n            \"content\": {\n              \"application/json\": {\n                \"schema\": {}\n              }\n            }\n          },\n          \"422\": {\n            \"description\": \"Validation Error\",\n            \"content\": {\n              \"application/json\": {\n                \"schema\": {\n                  \"$ref\": \"#/components/schemas/HTTPValidationError\"\n                }\n              }\n            }\n          }\n        }\n      }\n    }\n  },\n  \"components\": {\n    \"securitySchemes\": {\n      \"bearerAuth\": {\n        \"type\": \"http\",\n        \"scheme\": \"bearer\",\n        \"bearerFormat\": \"JWT\"\n      }\n    },\n    \"schemas\": {\n      \"BaseModel\": {\n        \"properties\": {},\n        \"type\": \"object\",\n        \"title\": \"BaseModel\"\n      },\n      \"ChatCompletionAssistantMessageParam\": {\n        \"properties\": {\n          \"role\": {\n            \"type\": \"string\",\n            \"enum\": [\n              \"assistant\"\n            ],\n            \"const\": \"assistant\",\n            \"title\": \"Role\"\n          },\n          \"content\": {\n            \"anyOf\": [\n              {\n                \"type\": \"string\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Content\"\n          },\n          \"function_call\": {\n            \"anyOf\": [\n              {\n                \"$ref\": \"#/components/schemas/FunctionCall\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ]\n          },\n          \"name\": {\n            \"type\": \"string\",\n            \"title\": \"Name\"\n          },\n          \"tool_calls\": {\n            \"items\": {\n              \"$ref\": \"#/components/schemas/ChatCompletionMessageToolCallParam\"\n            },\n            \"type\": \"array\",\n            \"title\": \"Tool Calls\"\n          }\n        },\n        \"type\": \"object\",\n        \"required\": [\n          \"role\"\n        ],\n        \"title\": \"ChatCompletionAssistantMessageParam\"\n      },\n      \"ChatCompletionContentPartImageParam\": {\n        \"properties\": {\n          \"image_url\": {\n            \"$ref\": \"#/components/schemas/ImageURL\"\n          },\n          \"type\": {\n            \"type\": \"string\",\n            \"enum\": [\n              \"image_url\"\n            ],\n            \"const\": \"image_url\",\n            \"title\": \"Type\"\n          }\n        },\n        \"type\": \"object\",\n        \"required\": [\n          \"image_url\",\n          \"type\"\n        ],\n        \"title\": \"ChatCompletionContentPartImageParam\"\n      },\n      \"ChatCompletionContentPartTextParam\": {\n        \"properties\": {\n          \"text\": {\n            \"type\": \"string\",\n            \"title\": \"Text\"\n          },\n          \"type\": {\n            \"type\": \"string\",\n            \"enum\": [\n              \"text\"\n            ],\n            \"const\": \"text\",\n            \"title\": \"Type\"\n          }\n        },\n        \"type\": \"object\",\n        \"required\": [\n          \"text\",\n          \"type\"\n        ],\n        \"title\": \"ChatCompletionContentPartTextParam\"\n      },\n      \"ChatCompletionFunctionMessageParam\": {\n        \"properties\": {\n          \"content\": {\n            \"anyOf\": [\n              {\n                \"type\": \"string\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Content\"\n          },\n          \"name\": {\n            \"type\": \"string\",\n            \"title\": \"Name\"\n          },\n          \"role\": {\n            \"type\": \"string\",\n            \"enum\": [\n              \"function\"\n            ],\n            \"const\": \"function\",\n            \"title\": \"Role\"\n          }\n        },\n        \"type\": \"object\",\n        \"required\": [\n          \"content\",\n          \"name\",\n          \"role\"\n        ],\n        \"title\": \"ChatCompletionFunctionMessageParam\"\n      },\n      \"ChatCompletionMessageToolCallParam\": {\n        \"properties\": {\n          \"id\": {\n            \"type\": \"string\",\n            \"title\": \"Id\"\n          },\n          \"function\": {\n            \"$ref\": \"#/components/schemas/Function\"\n          },\n          \"type\": {\n            \"type\": \"string\",\n            \"enum\": [\n              \"function\"\n            ],\n            \"const\": \"function\",\n            \"title\": \"Type\"\n          }\n        },\n        \"type\": \"object\",\n        \"required\": [\n          \"id\",\n          \"function\",\n          \"type\"\n        ],\n        \"title\": \"ChatCompletionMessageToolCallParam\"\n      },\n      \"ChatCompletionNamedFunction\": {\n        \"properties\": {\n          \"name\": {\n            \"type\": \"string\",\n            \"title\": \"Name\"\n          }\n        },\n        \"additionalProperties\": false,\n        \"type\": \"object\",\n        \"required\": [\n          \"name\"\n        ],\n        \"title\": \"ChatCompletionNamedFunction\"\n      },\n      \"ChatCompletionNamedToolChoiceParam\": {\n        \"properties\": {\n          \"function\": {\n            \"$ref\": \"#/components/schemas/ChatCompletionNamedFunction\"\n          },\n          \"type\": {\n            \"type\": \"string\",\n            \"enum\": [\n              \"function\"\n            ],\n            \"const\": \"function\",\n            \"title\": \"Type\",\n            \"default\": \"function\"\n          }\n        },\n        \"additionalProperties\": false,\n        \"type\": \"object\",\n        \"required\": [\n          \"function\"\n        ],\n        \"title\": \"ChatCompletionNamedToolChoiceParam\"\n      },\n      \"ChatCompletionRequest\": {\n        \"properties\": {\n          \"messages\": {\n            \"items\": {\n              \"anyOf\": [\n                {\n                  \"$ref\": \"#/components/schemas/ChatCompletionSystemMessageParam\"\n                },\n                {\n                  \"$ref\": \"#/components/schemas/ChatCompletionUserMessageParam\"\n                },\n                {\n                  \"$ref\": \"#/components/schemas/ChatCompletionAssistantMessageParam\"\n                },\n                {\n                  \"$ref\": \"#/components/schemas/ChatCompletionToolMessageParam\"\n                },\n                {\n                  \"$ref\": \"#/components/schemas/ChatCompletionFunctionMessageParam\"\n                },\n                {\n                  \"$ref\": \"#/components/schemas/CustomChatCompletionMessageParam\"\n                }\n              ]\n            },\n            \"type\": \"array\",\n            \"title\": \"Messages\"\n          },\n          \"model\": {\n            \"type\": \"string\",\n            \"title\": \"Model\"\n          },\n          \"frequency_penalty\": {\n            \"anyOf\": [\n              {\n                \"type\": \"number\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Frequency Penalty\",\n            \"default\": 0\n          },\n          \"logit_bias\": {\n            \"anyOf\": [\n              {\n                \"additionalProperties\": {\n                  \"type\": \"number\"\n                },\n                \"type\": \"object\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Logit Bias\"\n          },\n          \"logprobs\": {\n            \"anyOf\": [\n              {\n                \"type\": \"boolean\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Logprobs\",\n            \"default\": false\n          },\n          \"top_logprobs\": {\n            \"anyOf\": [\n              {\n                \"type\": \"integer\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Top Logprobs\",\n            \"default\": 0\n          },\n          \"max_tokens\": {\n            \"anyOf\": [\n              {\n                \"type\": \"integer\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Max Tokens\"\n          },\n          \"n\": {\n            \"anyOf\": [\n              {\n                \"type\": \"integer\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"N\",\n            \"default\": 1\n          },\n          \"presence_penalty\": {\n            \"anyOf\": [\n              {\n                \"type\": \"number\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Presence Penalty\",\n            \"default\": 0\n          },\n          \"response_format\": {\n            \"anyOf\": [\n              {\n                \"$ref\": \"#/components/schemas/ResponseFormat\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ]\n          },\n          \"seed\": {\n            \"anyOf\": [\n              {\n                \"type\": \"integer\",\n                \"maximum\": 9223372036854776000,\n                \"minimum\": -9223372036854776000\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Seed\"\n          },\n          \"stop\": {\n            \"anyOf\": [\n              {\n                \"type\": \"string\"\n              },\n              {\n                \"items\": {\n                  \"type\": \"string\"\n                },\n                \"type\": \"array\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Stop\"\n          },\n          \"stream\": {\n            \"anyOf\": [\n              {\n                \"type\": \"boolean\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Stream\",\n            \"default\": false\n          },\n          \"stream_options\": {\n            \"anyOf\": [\n              {\n                \"$ref\": \"#/components/schemas/StreamOptions\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ]\n          },\n          \"temperature\": {\n            \"anyOf\": [\n              {\n                \"type\": \"number\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Temperature\",\n            \"default\": 0.7\n          },\n          \"top_p\": {\n            \"anyOf\": [\n              {\n                \"type\": \"number\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Top P\",\n            \"default\": 1\n          },\n          \"tools\": {\n            \"anyOf\": [\n              {\n                \"items\": {\n                  \"$ref\": \"#/components/schemas/ChatCompletionToolsParam\"\n                },\n                \"type\": \"array\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Tools\"\n          },\n          \"tool_choice\": {\n            \"anyOf\": [\n              {\n                \"type\": \"string\",\n                \"enum\": [\n                  \"none\"\n                ],\n                \"const\": \"none\"\n              },\n              {\n                \"$ref\": \"#/components/schemas/ChatCompletionNamedToolChoiceParam\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Tool Choice\",\n            \"default\": \"none\"\n          },\n          \"user\": {\n            \"anyOf\": [\n              {\n                \"type\": \"string\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"User\"\n          },\n          \"best_of\": {\n            \"anyOf\": [\n              {\n                \"type\": \"integer\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Best Of\"\n          },\n          \"use_beam_search\": {\n            \"type\": \"boolean\",\n            \"title\": \"Use Beam Search\",\n            \"default\": false\n          },\n          \"top_k\": {\n            \"type\": \"integer\",\n            \"title\": \"Top K\",\n            \"default\": -1\n          },\n          \"min_p\": {\n            \"type\": \"number\",\n            \"title\": \"Min P\",\n            \"default\": 0\n          },\n          \"repetition_penalty\": {\n            \"type\": \"number\",\n            \"title\": \"Repetition Penalty\",\n            \"default\": 1\n          },\n          \"length_penalty\": {\n            \"type\": \"number\",\n            \"title\": \"Length Penalty\",\n            \"default\": 1\n          },\n          \"early_stopping\": {\n            \"type\": \"boolean\",\n            \"title\": \"Early Stopping\",\n            \"default\": false\n          },\n          \"stop_token_ids\": {\n            \"anyOf\": [\n              {\n                \"items\": {\n                  \"type\": \"integer\"\n                },\n                \"type\": \"array\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Stop Token Ids\"\n          },\n          \"include_stop_str_in_output\": {\n            \"type\": \"boolean\",\n            \"title\": \"Include Stop Str In Output\",\n            \"default\": false\n          },\n          \"ignore_eos\": {\n            \"type\": \"boolean\",\n            \"title\": \"Ignore Eos\",\n            \"default\": false\n          },\n          \"min_tokens\": {\n            \"type\": \"integer\",\n            \"title\": \"Min Tokens\",\n            \"default\": 0\n          },\n          \"skip_special_tokens\": {\n            \"type\": \"boolean\",\n            \"title\": \"Skip Special Tokens\",\n            \"default\": true\n          },\n          \"spaces_between_special_tokens\": {\n            \"type\": \"boolean\",\n            \"title\": \"Spaces Between Special Tokens\",\n            \"default\": true\n          },\n          \"truncate_prompt_tokens\": {\n            \"anyOf\": [\n              {\n                \"type\": \"integer\",\n                \"minimum\": 1\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Truncate Prompt Tokens\"\n          },\n          \"echo\": {\n            \"type\": \"boolean\",\n            \"title\": \"Echo\",\n            \"description\": \"If true, the new message will be prepended with the last message if they belong to the same role.\",\n            \"default\": false\n          },\n          \"add_generation_prompt\": {\n            \"type\": \"boolean\",\n            \"title\": \"Add Generation Prompt\",\n            \"description\": \"If true, the generation prompt will be added to the chat template. This is a parameter used by chat template in tokenizer config of the model.\",\n            \"default\": true\n          },\n          \"add_special_tokens\": {\n            \"type\": \"boolean\",\n            \"title\": \"Add Special Tokens\",\n            \"description\": \"If true, special tokens (e.g. BOS) will be added to the prompt on top of what is added by the chat template. For most models, the chat template takes care of adding the special tokens so this should be set to false (as is the default).\",\n            \"default\": false\n          },\n          \"documents\": {\n            \"anyOf\": [\n              {\n                \"items\": {\n                  \"additionalProperties\": {\n                    \"type\": \"string\"\n                  },\n                  \"type\": \"object\"\n                },\n                \"type\": \"array\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Documents\",\n            \"description\": \"A list of dicts representing documents that will be accessible to the model if it is performing RAG (retrieval-augmented generation). If the template does not support RAG, this argument will have no effect. We recommend that each document should be a dict containing \\\"title\\\" and \\\"text\\\" keys.\"\n          },\n          \"chat_template\": {\n            \"anyOf\": [\n              {\n                \"type\": \"string\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Chat Template\",\n            \"description\": \"A Jinja template to use for this conversion. If this is not passed, the model's default chat template will be used instead.\"\n          },\n          \"chat_template_kwargs\": {\n            \"anyOf\": [\n              {\n                \"type\": \"object\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Chat Template Kwargs\",\n            \"description\": \"Additional kwargs to pass to the template renderer. Will be accessible by the chat template.\"\n          },\n          \"guided_json\": {\n            \"anyOf\": [\n              {\n                \"type\": \"string\"\n              },\n              {\n                \"type\": \"object\"\n              },\n              {\n                \"$ref\": \"#/components/schemas/BaseModel\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Guided Json\",\n            \"description\": \"If specified, the output will follow the JSON schema.\"\n          },\n          \"guided_regex\": {\n            \"anyOf\": [\n              {\n                \"type\": \"string\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Guided Regex\",\n            \"description\": \"If specified, the output will follow the regex pattern.\"\n          },\n          \"guided_choice\": {\n            \"anyOf\": [\n              {\n                \"items\": {\n                  \"type\": \"string\"\n                },\n                \"type\": \"array\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Guided Choice\",\n            \"description\": \"If specified, the output will be exactly one of the choices.\"\n          },\n          \"guided_grammar\": {\n            \"anyOf\": [\n              {\n                \"type\": \"string\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Guided Grammar\",\n            \"description\": \"If specified, the output will follow the context free grammar.\"\n          },\n          \"guided_decoding_backend\": {\n            \"anyOf\": [\n              {\n                \"type\": \"string\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Guided Decoding Backend\",\n            \"description\": \"If specified, will override the default guided decoding backend of the server for this specific request. If set, must be either 'outlines' / 'lm-format-enforcer'\"\n          },\n          \"guided_whitespace_pattern\": {\n            \"anyOf\": [\n              {\n                \"type\": \"string\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Guided Whitespace Pattern\",\n            \"description\": \"If specified, will override the default whitespace pattern for guided json decoding.\"\n          }\n        },\n        \"additionalProperties\": false,\n        \"type\": \"object\",\n        \"required\": [\n          \"messages\",\n          \"model\"\n        ],\n        \"title\": \"ChatCompletionRequest\"\n      },\n      \"ChatCompletionSystemMessageParam\": {\n        \"properties\": {\n          \"content\": {\n            \"type\": \"string\",\n            \"title\": \"Content\"\n          },\n          \"role\": {\n            \"type\": \"string\",\n            \"enum\": [\n              \"system\"\n            ],\n            \"const\": \"system\",\n            \"title\": \"Role\"\n          },\n          \"name\": {\n            \"type\": \"string\",\n            \"title\": \"Name\"\n          }\n        },\n        \"type\": \"object\",\n        \"required\": [\n          \"content\",\n          \"role\"\n        ],\n        \"title\": \"ChatCompletionSystemMessageParam\"\n      },\n      \"ChatCompletionToolMessageParam\": {\n        \"properties\": {\n          \"content\": {\n            \"type\": \"string\",\n            \"title\": \"Content\"\n          },\n          \"role\": {\n            \"type\": \"string\",\n            \"enum\": [\n              \"tool\"\n            ],\n            \"const\": \"tool\",\n            \"title\": \"Role\"\n          },\n          \"tool_call_id\": {\n            \"type\": \"string\",\n            \"title\": \"Tool Call Id\"\n          }\n        },\n        \"type\": \"object\",\n        \"required\": [\n          \"content\",\n          \"role\",\n          \"tool_call_id\"\n        ],\n        \"title\": \"ChatCompletionToolMessageParam\"\n      },\n      \"ChatCompletionToolsParam\": {\n        \"properties\": {\n          \"type\": {\n            \"type\": \"string\",\n            \"enum\": [\n              \"function\"\n            ],\n            \"const\": \"function\",\n            \"title\": \"Type\",\n            \"default\": \"function\"\n          },\n          \"function\": {\n            \"$ref\": \"#/components/schemas/FunctionDefinition\"\n          }\n        },\n        \"additionalProperties\": false,\n        \"type\": \"object\",\n        \"required\": [\n          \"function\"\n        ],\n        \"title\": \"ChatCompletionToolsParam\"\n      },\n      \"ChatCompletionUserMessageParam\": {\n        \"properties\": {\n          \"content\": {\n            \"anyOf\": [\n              {\n                \"type\": \"string\"\n              },\n              {\n                \"items\": {\n                  \"anyOf\": [\n                    {\n                      \"$ref\": \"#/components/schemas/ChatCompletionContentPartTextParam\"\n                    },\n                    {\n                      \"$ref\": \"#/components/schemas/ChatCompletionContentPartImageParam\"\n                    }\n                  ]\n                },\n                \"type\": \"array\"\n              }\n            ],\n            \"title\": \"Content\"\n          },\n          \"role\": {\n            \"type\": \"string\",\n            \"enum\": [\n              \"user\"\n            ],\n            \"const\": \"user\",\n            \"title\": \"Role\"\n          },\n          \"name\": {\n            \"type\": \"string\",\n            \"title\": \"Name\"\n          }\n        },\n        \"type\": \"object\",\n        \"required\": [\n          \"content\",\n          \"role\"\n        ],\n        \"title\": \"ChatCompletionUserMessageParam\"\n      },\n      \"CompletionRequest\": {\n        \"properties\": {\n          \"model\": {\n            \"type\": \"string\",\n            \"title\": \"Model\"\n          },\n          \"prompt\": {\n            \"anyOf\": [\n              {\n                \"items\": {\n                  \"type\": \"integer\"\n                },\n                \"type\": \"array\"\n              },\n              {\n                \"items\": {\n                  \"items\": {\n                    \"type\": \"integer\"\n                  },\n                  \"type\": \"array\"\n                },\n                \"type\": \"array\"\n              },\n              {\n                \"type\": \"string\"\n              },\n              {\n                \"items\": {\n                  \"type\": \"string\"\n                },\n                \"type\": \"array\"\n              }\n            ],\n            \"title\": \"Prompt\"\n          },\n          \"best_of\": {\n            \"anyOf\": [\n              {\n                \"type\": \"integer\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Best Of\"\n          },\n          \"echo\": {\n            \"anyOf\": [\n              {\n                \"type\": \"boolean\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Echo\",\n            \"default\": false\n          },\n          \"frequency_penalty\": {\n            \"anyOf\": [\n              {\n                \"type\": \"number\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Frequency Penalty\",\n            \"default\": 0\n          },\n          \"logit_bias\": {\n            \"anyOf\": [\n              {\n                \"additionalProperties\": {\n                  \"type\": \"number\"\n                },\n                \"type\": \"object\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Logit Bias\"\n          },\n          \"logprobs\": {\n            \"anyOf\": [\n              {\n                \"type\": \"integer\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Logprobs\"\n          },\n          \"max_tokens\": {\n            \"anyOf\": [\n              {\n                \"type\": \"integer\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Max Tokens\",\n            \"default\": 16\n          },\n          \"n\": {\n            \"type\": \"integer\",\n            \"title\": \"N\",\n            \"default\": 1\n          },\n          \"presence_penalty\": {\n            \"anyOf\": [\n              {\n                \"type\": \"number\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Presence Penalty\",\n            \"default\": 0\n          },\n          \"seed\": {\n            \"anyOf\": [\n              {\n                \"type\": \"integer\",\n                \"maximum\": 9223372036854776000,\n                \"minimum\": -9223372036854776000\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Seed\"\n          },\n          \"stop\": {\n            \"anyOf\": [\n              {\n                \"type\": \"string\"\n              },\n              {\n                \"items\": {\n                  \"type\": \"string\"\n                },\n                \"type\": \"array\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Stop\"\n          },\n          \"stream\": {\n            \"anyOf\": [\n              {\n                \"type\": \"boolean\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Stream\",\n            \"default\": false\n          },\n          \"stream_options\": {\n            \"anyOf\": [\n              {\n                \"$ref\": \"#/components/schemas/StreamOptions\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ]\n          },\n          \"suffix\": {\n            \"anyOf\": [\n              {\n                \"type\": \"string\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Suffix\"\n          },\n          \"temperature\": {\n            \"anyOf\": [\n              {\n                \"type\": \"number\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Temperature\",\n            \"default\": 1\n          },\n          \"top_p\": {\n            \"anyOf\": [\n              {\n                \"type\": \"number\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Top P\",\n            \"default\": 1\n          },\n          \"user\": {\n            \"anyOf\": [\n              {\n                \"type\": \"string\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"User\"\n          },\n          \"use_beam_search\": {\n            \"type\": \"boolean\",\n            \"title\": \"Use Beam Search\",\n            \"default\": false\n          },\n          \"top_k\": {\n            \"type\": \"integer\",\n            \"title\": \"Top K\",\n            \"default\": -1\n          },\n          \"min_p\": {\n            \"type\": \"number\",\n            \"title\": \"Min P\",\n            \"default\": 0\n          },\n          \"repetition_penalty\": {\n            \"type\": \"number\",\n            \"title\": \"Repetition Penalty\",\n            \"default\": 1\n          },\n          \"length_penalty\": {\n            \"type\": \"number\",\n            \"title\": \"Length Penalty\",\n            \"default\": 1\n          },\n          \"early_stopping\": {\n            \"type\": \"boolean\",\n            \"title\": \"Early Stopping\",\n            \"default\": false\n          },\n          \"stop_token_ids\": {\n            \"anyOf\": [\n              {\n                \"items\": {\n                  \"type\": \"integer\"\n                },\n                \"type\": \"array\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Stop Token Ids\"\n          },\n          \"include_stop_str_in_output\": {\n            \"type\": \"boolean\",\n            \"title\": \"Include Stop Str In Output\",\n            \"default\": false\n          },\n          \"ignore_eos\": {\n            \"type\": \"boolean\",\n            \"title\": \"Ignore Eos\",\n            \"default\": false\n          },\n          \"min_tokens\": {\n            \"type\": \"integer\",\n            \"title\": \"Min Tokens\",\n            \"default\": 0\n          },\n          \"skip_special_tokens\": {\n            \"type\": \"boolean\",\n            \"title\": \"Skip Special Tokens\",\n            \"default\": true\n          },\n          \"spaces_between_special_tokens\": {\n            \"type\": \"boolean\",\n            \"title\": \"Spaces Between Special Tokens\",\n            \"default\": true\n          },\n          \"truncate_prompt_tokens\": {\n            \"anyOf\": [\n              {\n                \"type\": \"integer\",\n                \"minimum\": 1\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Truncate Prompt Tokens\"\n          },\n          \"allowed_token_ids\": {\n            \"anyOf\": [\n              {\n                \"items\": {\n                  \"type\": \"integer\"\n                },\n                \"type\": \"array\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Allowed Token Ids\"\n          },\n          \"add_special_tokens\": {\n            \"type\": \"boolean\",\n            \"title\": \"Add Special Tokens\",\n            \"description\": \"If true (the default), special tokens (e.g. BOS) will be added to the prompt.\",\n            \"default\": true\n          },\n          \"response_format\": {\n            \"anyOf\": [\n              {\n                \"$ref\": \"#/components/schemas/ResponseFormat\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"description\": \"Similar to chat completion, this parameter specifies the format of output. Only {'type': 'json_object'} or {'type': 'text' } is supported.\"\n          },\n          \"guided_json\": {\n            \"anyOf\": [\n              {\n                \"type\": \"string\"\n              },\n              {\n                \"type\": \"object\"\n              },\n              {\n                \"$ref\": \"#/components/schemas/BaseModel\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Guided Json\",\n            \"description\": \"If specified, the output will follow the JSON schema.\"\n          },\n          \"guided_regex\": {\n            \"anyOf\": [\n              {\n                \"type\": \"string\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Guided Regex\",\n            \"description\": \"If specified, the output will follow the regex pattern.\"\n          },\n          \"guided_choice\": {\n            \"anyOf\": [\n              {\n                \"items\": {\n                  \"type\": \"string\"\n                },\n                \"type\": \"array\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Guided Choice\",\n            \"description\": \"If specified, the output will be exactly one of the choices.\"\n          },\n          \"guided_grammar\": {\n            \"anyOf\": [\n              {\n                \"type\": \"string\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Guided Grammar\",\n            \"description\": \"If specified, the output will follow the context free grammar.\"\n          },\n          \"guided_decoding_backend\": {\n            \"anyOf\": [\n              {\n                \"type\": \"string\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Guided Decoding Backend\",\n            \"description\": \"If specified, will override the default guided decoding backend of the server for this specific request. If set, must be one of 'outlines' / 'lm-format-enforcer'\"\n          },\n          \"guided_whitespace_pattern\": {\n            \"anyOf\": [\n              {\n                \"type\": \"string\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Guided Whitespace Pattern\",\n            \"description\": \"If specified, will override the default whitespace pattern for guided json decoding.\"\n          }\n        },\n        \"additionalProperties\": false,\n        \"type\": \"object\",\n        \"required\": [\n          \"model\",\n          \"prompt\"\n        ],\n        \"title\": \"CompletionRequest\"\n      },\n      \"CustomChatCompletionContentPartParam\": {\n        \"properties\": {\n          \"type\": {\n            \"type\": \"string\",\n            \"title\": \"Type\"\n          }\n        },\n        \"additionalProperties\": true,\n        \"type\": \"object\",\n        \"required\": [\n          \"type\"\n        ],\n        \"title\": \"CustomChatCompletionContentPartParam\"\n      },\n      \"CustomChatCompletionMessageParam\": {\n        \"properties\": {\n          \"role\": {\n            \"type\": \"string\",\n            \"title\": \"Role\"\n          },\n          \"content\": {\n            \"anyOf\": [\n              {\n                \"type\": \"string\"\n              },\n              {\n                \"items\": {\n                  \"anyOf\": [\n                    {\n                      \"$ref\": \"#/components/schemas/ChatCompletionContentPartTextParam\"\n                    },\n                    {\n                      \"$ref\": \"#/components/schemas/ChatCompletionContentPartImageParam\"\n                    },\n                    {\n                      \"$ref\": \"#/components/schemas/CustomChatCompletionContentPartParam\"\n                    }\n                  ]\n                },\n                \"type\": \"array\"\n              }\n            ],\n            \"title\": \"Content\"\n          },\n          \"name\": {\n            \"type\": \"string\",\n            \"title\": \"Name\"\n          }\n        },\n        \"type\": \"object\",\n        \"required\": [\n          \"role\"\n        ],\n        \"title\": \"CustomChatCompletionMessageParam\",\n        \"description\": \"Enables custom roles in the Chat Completion API.\"\n      },\n      \"DetokenizeRequest\": {\n        \"properties\": {\n          \"model\": {\n            \"type\": \"string\",\n            \"title\": \"Model\"\n          },\n          \"tokens\": {\n            \"items\": {\n              \"type\": \"integer\"\n            },\n            \"type\": \"array\",\n            \"title\": \"Tokens\"\n          }\n        },\n        \"additionalProperties\": false,\n        \"type\": \"object\",\n        \"required\": [\n          \"model\",\n          \"tokens\"\n        ],\n        \"title\": \"DetokenizeRequest\"\n      },\n      \"EmbeddingRequest\": {\n        \"properties\": {\n          \"model\": {\n            \"type\": \"string\",\n            \"title\": \"Model\"\n          },\n          \"input\": {\n            \"anyOf\": [\n              {\n                \"items\": {\n                  \"type\": \"integer\"\n                },\n                \"type\": \"array\"\n              },\n              {\n                \"items\": {\n                  \"items\": {\n                    \"type\": \"integer\"\n                  },\n                  \"type\": \"array\"\n                },\n                \"type\": \"array\"\n              },\n              {\n                \"type\": \"string\"\n              },\n              {\n                \"items\": {\n                  \"type\": \"string\"\n                },\n                \"type\": \"array\"\n              }\n            ],\n            \"title\": \"Input\"\n          },\n          \"encoding_format\": {\n            \"anyOf\": [\n              {\n                \"type\": \"string\",\n                \"pattern\": \"^(float|base64)$\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Encoding Format\",\n            \"default\": \"float\"\n          },\n          \"dimensions\": {\n            \"anyOf\": [\n              {\n                \"type\": \"integer\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Dimensions\"\n          },\n          \"user\": {\n            \"anyOf\": [\n              {\n                \"type\": \"string\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"User\"\n          },\n          \"additional_data\": {\n            \"anyOf\": [\n              {},\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Additional Data\"\n          }\n        },\n        \"additionalProperties\": false,\n        \"type\": \"object\",\n        \"required\": [\n          \"model\",\n          \"input\"\n        ],\n        \"title\": \"EmbeddingRequest\"\n      },\n      \"Function\": {\n        \"properties\": {\n          \"arguments\": {\n            \"type\": \"string\",\n            \"title\": \"Arguments\"\n          },\n          \"name\": {\n            \"type\": \"string\",\n            \"title\": \"Name\"\n          }\n        },\n        \"type\": \"object\",\n        \"required\": [\n          \"arguments\",\n          \"name\"\n        ],\n        \"title\": \"Function\"\n      },\n      \"FunctionCall\": {\n        \"properties\": {\n          \"name\": {\n            \"type\": \"string\",\n            \"title\": \"Name\"\n          },\n          \"arguments\": {\n            \"type\": \"string\",\n            \"title\": \"Arguments\"\n          }\n        },\n        \"additionalProperties\": false,\n        \"type\": \"object\",\n        \"required\": [\n          \"name\",\n          \"arguments\"\n        ],\n        \"title\": \"FunctionCall\"\n      },\n      \"FunctionDefinition\": {\n        \"properties\": {\n          \"name\": {\n            \"type\": \"string\",\n            \"title\": \"Name\"\n          },\n          \"description\": {\n            \"anyOf\": [\n              {\n                \"type\": \"string\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Description\"\n          },\n          \"parameters\": {\n            \"anyOf\": [\n              {\n                \"type\": \"object\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Parameters\"\n          }\n        },\n        \"additionalProperties\": false,\n        \"type\": \"object\",\n        \"required\": [\n          \"name\"\n        ],\n        \"title\": \"FunctionDefinition\"\n      },\n      \"HTTPValidationError\": {\n        \"properties\": {\n          \"detail\": {\n            \"items\": {\n              \"$ref\": \"#/components/schemas/ValidationError\"\n            },\n            \"type\": \"array\",\n            \"title\": \"Detail\"\n          }\n        },\n        \"type\": \"object\",\n        \"title\": \"HTTPValidationError\"\n      },\n      \"ImageURL\": {\n        \"properties\": {\n          \"url\": {\n            \"type\": \"string\",\n            \"title\": \"Url\"\n          },\n          \"detail\": {\n            \"type\": \"string\",\n            \"enum\": [\n              \"auto\",\n              \"low\",\n              \"high\"\n            ],\n            \"title\": \"Detail\"\n          }\n        },\n        \"type\": \"object\",\n        \"required\": [\n          \"url\"\n        ],\n        \"title\": \"ImageURL\"\n      },\n      \"ResponseFormat\": {\n        \"properties\": {\n          \"type\": {\n            \"type\": \"string\",\n            \"enum\": [\n              \"text\",\n              \"json_object\"\n            ],\n            \"title\": \"Type\"\n          }\n        },\n        \"additionalProperties\": false,\n        \"type\": \"object\",\n        \"required\": [\n          \"type\"\n        ],\n        \"title\": \"ResponseFormat\"\n      },\n      \"StreamOptions\": {\n        \"properties\": {\n          \"include_usage\": {\n            \"anyOf\": [\n              {\n                \"type\": \"boolean\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Include Usage\",\n            \"default\": true\n          },\n          \"continuous_usage_stats\": {\n            \"anyOf\": [\n              {\n                \"type\": \"boolean\"\n              },\n              {\n                \"type\": \"null\"\n              }\n            ],\n            \"title\": \"Continuous Usage Stats\",\n            \"default\": true\n          }\n        },\n        \"additionalProperties\": false,\n        \"type\": \"object\",\n        \"title\": \"StreamOptions\"\n      },\n      \"TokenizeChatRequest\": {\n        \"properties\": {\n          \"model\": {\n            \"type\": \"string\",\n            \"title\": \"Model\"\n          },\n          \"messages\": {\n            \"items\": {\n              \"anyOf\": [\n                {\n                  \"$ref\": \"#/components/schemas/ChatCompletionSystemMessageParam\"\n                },\n                {\n                  \"$ref\": \"#/components/schemas/ChatCompletionUserMessageParam\"\n                },\n                {\n                  \"$ref\": \"#/components/schemas/ChatCompletionAssistantMessageParam\"\n                },\n                {\n                  \"$ref\": \"#/components/schemas/ChatCompletionToolMessageParam\"\n                },\n                {\n                  \"$ref\": \"#/components/schemas/ChatCompletionFunctionMessageParam\"\n                },\n                {\n                  \"$ref\": \"#/components/schemas/CustomChatCompletionMessageParam\"\n                }\n              ]\n            },\n            \"type\": \"array\",\n            \"title\": \"Messages\"\n          },\n          \"add_generation_prompt\": {\n            \"type\": \"boolean\",\n            \"title\": \"Add Generation Prompt\",\n            \"default\": true\n          },\n          \"add_special_tokens\": {\n            \"type\": \"boolean\",\n            \"title\": \"Add Special Tokens\",\n            \"default\": false\n          }\n        },\n        \"additionalProperties\": false,\n        \"type\": \"object\",\n        \"required\": [\n          \"model\",\n          \"messages\"\n        ],\n        \"title\": \"TokenizeChatRequest\"\n      },\n      \"TokenizeCompletionRequest\": {\n        \"properties\": {\n          \"model\": {\n            \"type\": \"string\",\n            \"title\": \"Model\"\n          },\n          \"prompt\": {\n            \"type\": \"string\",\n            \"title\": \"Prompt\"\n          },\n          \"add_special_tokens\": {\n            \"type\": \"boolean\",\n            \"title\": \"Add Special Tokens\",\n            \"default\": true\n          }\n        },\n        \"additionalProperties\": false,\n        \"type\": \"object\",\n        \"required\": [\n          \"model\",\n          \"prompt\"\n        ],\n        \"title\": \"TokenizeCompletionRequest\"\n      },\n      \"ValidationError\": {\n        \"properties\": {\n          \"loc\": {\n            \"items\": {\n              \"anyOf\": [\n                {\n                  \"type\": \"string\"\n                },\n                {\n                  \"type\": \"integer\"\n                }\n              ]\n            },\n            \"type\": \"array\",\n            \"title\": \"Location\"\n          },\n          \"msg\": {\n            \"type\": \"string\",\n            \"title\": \"Message\"\n          },\n          \"type\": {\n            \"type\": \"string\",\n            \"title\": \"Error Type\"\n          }\n        },\n        \"type\": \"object\",\n        \"required\": [\n          \"loc\",\n          \"msg\",\n          \"type\"\n        ],\n        \"title\": \"ValidationError\"\n      }\n    }\n  }\n}\n"
  },
  "relations": [
    {
      "type": "apiProvidedBy",
      "targetRef": "component:default/developer-model-service",
      "target": {
        "kind": "component",
        "namespace": "default",
        "name": "developer-model-service"
      }
    },
    {
      "type": "dependencyOf",
      "targetRef": "component:default/developer-model-service",
      "target": {
        "kind": "component",
        "namespace": "default",
        "name": "developer-model-service"
      }
    },
    {
      "type": "ownedBy",
      "targetRef": "user:default/exampleuser",
      "target": {
        "kind": "user",
        "namespace": "default",
        "name": "exampleuser"
      }
    }
  ]
}

            `,
          inputSchema: zodToJsonSchema(
            z.object({
              uid: z
                .string()
                .describe(
                  'The unique ID (uid) of the entity. This is a UUID, e.g UUID v4 format string',
                ),
            }),
          ),
        },
      ],
    };
  });

  server.server.setRequestHandler(CallToolRequestSchema, async request => {
    try {
      if (!request.params.arguments) {
        throw new Error('Arguments are required for a tool call.');
      }

      logger.info(`Received tool call "${request.params.name}"`);

      switch (request.params.name) {
        case 'list_entities': {
          const filter: Record<string, string> = {
            kind: request.params.arguments.kind as any,
          };
          const tok = getAuthToken(auth);
          const options: CatalogRequestOptions = {
            token: (await tok).token,
          };
          const entities = await catalogClient.getEntities({ filter }, options);

          /*
          // GGM attempt at using CatalogService ... got stuck on the credentials for CatalogServiceRequestOptions
          const entityRequest: GetEntitiesRequest = {
            filter: kindFilter,
          }
        
          const options: CatalogServiceRequestOptions = {

          };
          
          const entities = await catalog.getEntities(entityRequest, options)
          */

          const text = JSON.stringify(
            entities.items.map((e: any) => {
              return {
                uid: e.metadata.uid,
                name: e.metadata.name,
                type: e.metadata.type,
              };
            }),
          );

          return {
            content: [
              {
                type: 'text',
                text,
              },
            ],
          };
        }

        /* My changes Implementation */

        case 'list_entities_with_tags': {
          const filter: Record<string, string> = {
            kind: request.params.arguments.kind as string,
          };
          const tok = getAuthToken(auth);
          const options: CatalogRequestOptions = {
            token: (await tok).token,
          };
          const entities = await catalogClient.getEntities({ filter }, options);
          let text: string;
          if (entities.items.length === 0) {
            text = `No entities properties found: '${filter.kind}'.`;
          } else {
            text = JSON.stringify(
              entities.items.map((e: any) => {
                return {
                  uid: e.metadata.uid,
                  name: e.metadata.name,
                  type: e.metadata.type,
                  tags: e.metadata.tags,
                };
              }),
            );
            /*  text = JSON.stringify(entities.items, null, 2); */
          }
          return {
            content: [
              {
                type: 'text',
                text: text,
              },
            ],
          };
        }

        /* end of Ugs changes */

        case 'get_entity_details': {
          const tok = getAuthToken(auth);
          const myToken = (await tok).token;
          /* GGM failed attempt with getEntitiesByRef
          const options: CatalogRequestOptions = {
            token: (await tok).token
          }
          const ref: GetEntitiesByRefsRequest = {
            entityRefs: [request.params.arguments.uid as any]
          }
        
          const e = await catalogClient.getEntitiesByRefs(ref, options) // TODO verify input
          */

          const uid = request.params.arguments.uid as any;
          const baseURL = await discovery.getBaseUrl('catalog');
          const fetchAPI = {
            fetch: fetch,
          };

          const response = await fetchAPI.fetch(
            `${baseURL}/entities/by-uid/${uid}`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${myToken}`,
              },
            },
          );
          if (!response.ok) {
            const payload = await response.json();
            const payloadString = payload as string;
            logger.warn(
              `Error in get_entity_details for UID ${uid}: ${payloadString}`,
            );
            logger.error(payload);
            throw new Error(
              `Error in get_entity_details for UID ${uid}: ${payloadString}`,
            );
          }
          const entity = (await response.json()) as EntityEnvelope;

          return {
            // content: [{ type: "text", text: JSON.stringify(e, null, 2) }],
            content: [{ type: 'text', text: JSON.stringify(entity, null, 2) }],
          };
        }

        default:
          throw new Error(`Unknown tool call "${request.params.name}"`);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid input: ${JSON.stringify(error.errors)}`);
      }

      throw error;
    }
  });

  return server;
}

async function getAuthToken(auth: AuthService): Promise<{ token: string }> {
  return await auth.getPluginRequestToken({
    targetPluginId: 'catalog',
    onBehalfOf: await auth.getOwnServiceCredentials(),
  });
}

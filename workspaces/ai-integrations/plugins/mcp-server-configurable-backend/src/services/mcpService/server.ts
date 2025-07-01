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

            [{"uid":"91be1584-8919-4a72-a355-85e1e67327ab","name":"model-service-api", "type": "API":},  :This entity output is used to call the name of the API from the backstage catalog,
            {"uid":"932721b4-136e-4156-a286-d8fe18367bd1","name":"developer-model-service", "type": "Component"}: This entity output specifies the exact component on the backstage catalog,
            {"uid":"ac3fc98a-5aba-478b-bb91-767c121dfe15", "name":"generated-c4d4657b4fbb886fe0a962cdf12b8732d33946ca", "type":"location"},: this entity output is used to call the location that is available on backstage catalog.
            {"uid":"74d0d413-75fd-4e38-aacd-a3c022c5ca3c","name":"ibm-granite-8b-code-instruct", "type":"resources"} : this entity output uses the provided uid to call the resources available on backstage catalog]
          
          when asked to list the names, here is an output example:
           model-service-api
           developer-model-service
           generated-c4d4657b4fbb886fe0a962cdf12b8732d33946ca
           ibm-granite-8b-code-instruct"

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
            [{"uid":"10c4f17d-025d-420c-9de9-f2b6492d32fe","name":"model-service-api","tags":["api","openai","vllm"]}, : This entity output is used to call the name of the API tags from the backstage catalog,

            {"uid":"25c84ff6-3d2f-4cc4-86e5-1b6377752d41","name":"developer-model-service","tags":["genai","ibm-granite","vllm","llm","developer-model-service","authenticated","gateway"]},:This entity output specifies the exact tags for component on the backstage catalog,
            
            {"uid":"b85eadc8-f3d8-4a70-820d-39062eb9e5ac","name":"generated-c4d4657b4fbb886fe0a962cdf12b8732d33946ca"},:this entity output is used to call the location tags that is available on backstage catalog.

            {"uid":"c6c11e53-e931-4490-b458-3f850c0f3ed0","name":"ibm-granite-8b-code-instruct","tags":["genai","ibm","llm","granite","conversational","task-text-generation"]}: this entity output uses the provided uid to call the resources tags available on backstage catalog]

            The output of this is a json array with the following fields:
            - the 'name' field is a string that shows the human readable name
            - the 'uid' field is a string used to identify the tool 
            - the 'type' is a readable string for the tool category
            - the 'tags' is a readable string for descriptive labels of the tool.
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

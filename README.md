# Lodging Recommendation Service With Azure OpenAI and YugabyteDB

This is a sample Node.JS and React application that demonstrates how to build generative AI applications using the Azure OpenAI Service and YugabyteDB.

The app provides lodging recommendations for travelers going to San Francisco. It supports two distinct modes:

![azure_openao_lodging-2](https://github.com/YugabyteDB-Samples/yugabytedb-azure-openai-lodging-service/assets/1537233/078e88db-d291-48d5-9909-0be7d31ac698)

* *Azure OpenAI Chat Mode*: In this mode, the Node.js backend leverages one of the Azure GPT models to generate lodging recommendations based on the user's input.
* *YugabyteDB Embeddings Mode*: Initially, the backend employs an Azure OpenAI Embeddings model to convert the user's prompt into an embedding (a vectorized representation of the text data). Subsequently, the server does a similarity search in YugabyteDB finding Airbnb properties which descriptions are related to the user's prompt. YugabyteDB relies on the PostgreSQL pgvector extension for the similarity search and other generative AI use cases.

## Prerequisites

* A Microsoft Azure subscription.
* An Azure OpenAI Service resource with GPT and Embedding models deployed. For more information about model deployment, see the [resource deployment guide](https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/create-resource?pivots=web-portal).
* The latest [Node.js version](https://github.com/nodejs/release#release-schedule).
* A YugabyteDB cluster of version [v2.25+](https://download.yugabyte.com/).

## Download Application and Provide Azure OpenAI Settings

Download the application and provide settings specific to your instance of the Azure OpenAI Service:

1. Clone the repository:
    ```shell
    git clone https://github.com/YugabyteDB-Samples/yugabytedb-azure-openai-lodging-service
    ```
2. Initialize the project:
    ```shell
    npm i 
    
    cd {project_dir}/frontend
    npm i 
    ```
3. Open the `{project_dir}/application.properties.ini` file and fill in the Azure specific settings:
    ```properties
    AZURE_OPENAI_KEY= # The Azure OpenAI API key
    AZURE_OPENAI_ENDPOINT= # An endpoint for the Language APIs
    AZURE_GPT_MODEL_DEPLOYMENT_NAME = # A deployment name for the GPT model
    AZURE_EMBEDDING_MODEL_DEPLOYMENT_NAME = # A deployment name for the Embedding model
    ```

Follow [this Azure guide](https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/create-resource?pivots=web-portal), if you'd like to know how to deploy Azure models and find their names.

## Start YugabyteDB and Load Sample Data Set

Start a YugabyteDB isntance of version 2.19.2 or later:
```shell
mkdir ~/yb_docker_data

docker network create yb-network

docker run -d --name ybnode1 --hostname ybnode1 --net yb-network \
    -p 15433:15433 -p 7001:7000 -p 9001:9000 -p 5433:5433 \
    -v ~/yb_docker_data/node1:/home/yugabyte/yb_data --restart unless-stopped \
    yugabytedb/yugabyte:2.25.2.0-b359 \
    bin/yugabyted start \
    --base_dir=/home/yugabyte/yb_data --background=false

docker run -d --name ybnode2 --hostname ybnode2  --net yb-network \
    -p 15434:15433 -p 7002:7000 -p 9002:9000 -p 5434:5433 \
    -v ~/yb_docker_data/node2:/home/yugabyte/yb_data --restart unless-stopped \
    yugabytedb/yugabyte:2.25.2.0-b359 \
    bin/yugabyted start --join=ybnode1 \
    --base_dir=/home/yugabyte/yb_data --background=false
    
docker run -d --name ybnode3 --hostname ybnode3 --net yb-network \
    -p 15435:15433 -p 7003:7000 -p 9003:9000 -p 5435:5433 \
    -v ~/yb_docker_data/node3:/home/yugabyte/yb_data --restart unless-stopped \
    yugabytedb/yugabyte:2.25.2.0-b359 \
    bin/yugabyted start --join=ybnode1 \
    --base_dir=/home/yugabyte/yb_data --background=false
```

The database connectivity settings are provided in the `{project_dir}/application.properties.ini` file and do not need to be changed if you started the cluster with the command above:
```properties
DATABASE_HOST=localhost
DATABASE_PORT=5433
DATABASE_NAME=yugabyte
DATABASE_USER=yugabyte
DATABASE_PASSWORD=yugabyte
```

Next, load the sample Airbnb data set for the properties in San Francisco:
1. Create the original schema:
    ```shell
    ./bin/ysqlsh -h 127.0.0.1 -p 5433 -U yugabyte -d yugabyte -f {project_dir}/sql/0_airbnb_listings.sql
    ```

2. Load the data:
    ```shell
    ./bin/ysqlsh -h 127.0.0.1 -p 5433 -U yugabyte -c "\copy airbnb_listing from '{project_dir}/sql/sf_airbnb_listings.csv' DELIMITER ',' CSV HEADER;"
    ```
3. Execute the following script to enable the pgvector extension, add the `description_embedding` column of the vector type and create index:
    ```shell
    ./bin/ysqlsh -h 127.0.0.1 -p 5433 -U yugabyte -c "\i {project_dir}/sql/1_airbnb_embeddings.sql"
    ```
    The search speed gets increased by using [vector indexing](https://docs.yugabyte.com/preview/explore/ysql-language-features/pg-extensions/extension-pgvector/#vector-indexing). YugabyteDB currently supports the Hierarchical Navigable Small World (HNSW) index type. This application uses cosine distance for indexing, as the backend query is using cosine similarity search.

## Generate Embeddings for Airbnb Listing Descriptions

Airbnb properties provide a detailed property description (rooms number, amenities, location and other perks) in the `description` column. That information is a perfect fit for the similarity search against user prompts. However, the text data of the `description` column needs to be transformed into a vectorized representation.

Use the `embeddings_generator.js` tool to generate embeddings for all Arbnb properties descriptions. The tool leverages the Azure OpenAI Embedding model and stores the generated vectors in the `description_embedding` column in the database:

```shell
node {project_dir}backend/embeddings_generator.js
```

It can take 10+ minutes to generate embeddings for over 7000 Airbnb properties. You'll see the message below once the generation is over:
```shell
....
Processing rows starting from 34746755
Processed 7551 rows
Processing rows starting from 35291912
Finished generating embeddings for 7551 rows
```

## Starting the Application

1. Start the Node.js backend:
    ```shell
    cd {project_dir}/backend
    npm start
    ```
2. Start the React frontend:
    ```shell
    cd {project_dir}/backend
    DANGEROUSLY_DISABLE_HOST_CHECK=true npm start
    ```

3. Access the application's user interface at:
    http://localhost:3000

Enjoy exploring the app and toggling between the two modes: *Azure OpenAI Chat* and *YugabyteDB Embeddings*. The latter is significantly faster.

![app_screenshot](https://github.com/YugabyteDB-Samples/yugabytedb-azure-openai-lodging-service/assets/1537233/02014aa2-d240-421f-b38c-98f380546a56)

Here are some sample prompts to get you started:
```
We're traveling to San Francisco from October 21st through 28th. We need a hotel with parking.

I'm looking for an apartment near the Golden Gate Bridge with a nice view of the Bay.

I'd like a hotel near Fisherman's Wharf with a Bay view.

An apartment close to the Salesforce Tower, within walking distance of Blue Bottle Coffee.
```

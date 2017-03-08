IF OBJECT_ID('pipeline_output') IS NOT NULL
 BEGIN
	USE imaginem
	GO

	CREATE TABLE dbo.pipeline_output(
		id varchar(50) NULL,
		processing_pipeline ntext NULL,
		image_url nvarchar(max) NULL,
		image_parameters ntext NULL,
		job_output ntext NULL,
		timestamp datetime NULL,
		batch_id varchar(100) NULL,
		categoriesJSON  AS (json_query(rtrim(CONVERT(nvarchar(max),job_output)),'$.generalclassification.categories')),
		tagsJSON  AS (json_query(rtrim(CONVERT(nvarchar(max),job_output)),'$.generalclassification.tags')),
		descriptionJSON  AS (json_query(rtrim(CONVERT(nvarchar(max),job_output)),'$.generalclassification.description.tags'))
	GO

	CREATE NONCLUSTERED INDEX IX_pipeline_output ON dbo.pipeline_output
	(
		timestamp ASC
	)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON)
	GO

	ALTER TABLE dbo.pipeline_output
	ADD CONSTRAINT PK_pipeline_output_ID PRIMARY KEY CLUSTERED (ID);  
 END
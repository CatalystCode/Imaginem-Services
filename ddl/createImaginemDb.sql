CREATE TABLE [dbo].[pipeline_output](
    [id] [nvarchar](max) NULL,
    [processing_pipeline] [ntext] NULL,
    [image_url] [nvarchar](max) NULL,
    [image_parameters] [ntext] NULL,
    [job_output] [ntext] NULL,
    [timestamp] [datetime] NULL,
    [batch_id] [varchar](100) NULL
)
GO

ALTER DATABASE [imaginem] SET  READ_WRITE 
GO
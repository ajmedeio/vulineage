SELECT 
    id.*, dtsr.report, dtv.vulnerability_id, vr.* 
FROM image_details id 
    JOIN digest_to_scan_report          dtsr ON id.digest = dtsr.digest
    JOIN digest_to_vulnerability        dtv ON dtsr.digest = dtv.digest
    JOIN vulnerability_record           vr ON dtv.vulnerability_id = vr.id 
WHERE dtsr.report IS NOT NULL 
    AND id.image_id = 'sha256:00005fba3f7c106df1dcdd5753bc18ac6181d9ad0f9aaa17d59d2af76590c7ed'

SELECT ld.*, iil.image_id, id.committed_date
FROM lineage_details ld
    JOIN lineage_id_to_image_id  iil ON ld.lineage_id = iil.lineage_id
    JOIN image_details id ON iil.image_id = id.image_id 
WHERE ld.lineage_id = -1000033263475935320
ORDER BY id.committed_date

select type, name, tbl_name, sql FROM sqlite_master WHERE type='index'

-- create more indices to speed up queries
create index if not exists digest_to_scan_report_digest_idx on digest_to_scan_report (digest);
create index if not exists digest_to_vulnerability_digest_idx on digest_to_vulnerability (digest);
create index if not exists vulnerability_record_id_idx on vulnerability_record (id);

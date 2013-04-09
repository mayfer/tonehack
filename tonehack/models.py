from django.db import models
import simplejson as json

class Instrument(models.Model):
    id = models.AutoField(primary_key=True)
    waves_json = models.TextField()
    date = models.DateTimeField()
    owner = models.CharField(max_length=50)
    name = models.CharField(max_length=100)
    urlid = models.CharField(max_length=100, unique=True)

    class Meta:
        db_table = 'instruments'
        ordering = ['date']

    def __unicode__(self):
        freqs = [ str(wave['freq']) for wave in json.loads(self.waves_json) ]
        return self.name + " " + "/".join(freqs)

